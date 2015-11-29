var fs = require("fs");
var path = require("path");
var upath = require("upath");
var mkdirp = require("mkdirp");
var fswalk = require('fs-walk');
var _ = require('lodash');
var Ftp = require('ftpimp');
var minimatch = require('minimatch');

var ftp;

var listRemoteFiles = function(remotePath, callback, originalRemotePath) {
	remotePath = upath.toUnix(remotePath);
	if(!originalRemotePath)
		originalRemotePath = remotePath;
	ftp.ls(remotePath, function(err, remoteFiles) {
		if(err) { callback(err); return; }
		
		var result = [];
		var subdirs = [];
		
		if(remoteFiles.length == 0)
			callback(null, result);
		
		remoteFiles.forEach(function(fileInfo) {
			if(fileInfo.filename == "." || fileInfo.filename == "..") return;
			var remoteItemPath = upath.toUnix(path.join(remotePath, fileInfo.filename));
			if(fileInfo.isFile)
				result.push({ 
					name: remoteItemPath, 
					size: fileInfo.size,
					isDir: false
				})
			else if(fileInfo.isDirectory) {
				subdirs.push(fileInfo);
				result.push({ name: remoteItemPath, isDir: true });
			}
		});
		
		var finish = function() {
			result.forEach(function(item) { 
				item.name = item.name.replace(originalRemotePath, ""); 
				if(item.name[0] == "/") item.name = item.name.substr(1);
				if(onPrepareRemoteProgress) onPrepareRemoteProgress(item.name);
			});
			result = _.sortBy(result, function(item) { return item.name });
			callback(null, result);
		}
		
		var listNextSubdir = function() {
			var subdir = subdirs.pop();
			var subPath = upath.toUnix(path.join(remotePath, subdir.filename));
			listRemoteFiles(subPath, function(err, subResult) {
				if(err) { callback(err); return; }
				result = _.union(result, subResult)	
				if(subdirs.length == 0)
					finish();
				else
					listNextSubdir();
			}, originalRemotePath);
		}
		
		if(subdirs.length == 0) 
			finish();
		else
			listNextSubdir();
	});
}

var listLocalFiles = function(localPath, callback) {
	var files = [];
	fswalk.walk(localPath, function(basedir, filename, stat, next) {
		var filePath = path.join(basedir, filename);
		filePath = filePath.replace(localPath, "");
		filePath = upath.toUnix(filePath);
		if(filePath[0] == "/") filePath = filePath.substr(1);
		if(onPrepareLocalProgress) onPrepareLocalProgress(filePath);
		files.push({ 
			name: filePath, 
			size: stat.size,
			isDir: stat.isDirectory()
		});
		next();
	}, function(err) {
		callback(err, files);
	});
}

var prepareSyncObject = function(remoteFiles, localFiles, options, callback) {

	var from = options.upload ? localFiles : remoteFiles;
	var to = options.upload ? remoteFiles : localFiles;
	
	var skipIgnores = function(file) {
		var result = false;
		ftpConfig.ignore.forEach(function(ignore) {
			if(minimatch(file.name, ignore))
				result = true;
		});
		console.log(result);
		return result;
	}
	
	_.remove(from, skipIgnores);
	_.remove(to, skipIgnores);

	var filesToUpdate = [];
	var filesToAdd = [];
	var dirsToAdd = [];
	var filesToRemove = [];
	var dirsToRemove = [];
	
	if(options.mode == "force")
		from.forEach(function(fromFile) {
			var toEquivalent = to.find(function(toFile) { return toFile.name == fromFile.name });
			if(toEquivalent && !fromFile.isDir)
				filesToUpdate.push(fromFile.name);
			if(!toEquivalent) {
				if(fromFile.isDir)
					dirsToAdd.push(fromFile.name)
				else
					filesToAdd.push(fromFile.name);
			}
		});
	else
		from.forEach(function(fromFile) {
			var toEquivalent = to.find(function(toFile) { return toFile.name == fromFile.name });
			if(!toEquivalent && !fromFile.isDir) filesToAdd.push(fromFile.name);
			if(!toEquivalent && fromFile.isDir) dirsToAdd.push(fromFile.name);
			if(toEquivalent) toEquivalent.wasOnFrom = true;
			if(toEquivalent && toEquivalent.size != fromFile.size)
				filesToUpdate.push(fromFile.name);	
		});

	if(options.mode == "full")
		to.filter(function(toFile) { return !toFile.wasOnFrom })
			.forEach(function(toFile) {
				if(toFile.isDir)
					dirsToRemove.push(toFile.name)
				else
					filesToRemove.push(toFile.name);
			});

	callback(null, {
		_readMe: "Review list of sync operations, then use Ftp-sync: Commit command to accept changes",
		filesToUpdate: filesToUpdate,
		filesToAdd: filesToAdd,
		dirsToAdd: dirsToAdd, 
		filesToRemove: filesToRemove,
		dirsToRemove: dirsToRemove,
		totalOperations: function() {
			return this.filesToUpdate.length
				+ this.filesToAdd.length
				+ this.dirsToAdd.length 
				+ this.filesToRemove.length 
				+ this.dirsToRemove.length 
		}
	});
}

var onPrepareRemoteProgress, onPrepareLocalProgress;


var connected = false;
var connect = function(callback) {
	if(connected)
		callback();
	else
		ftp.connect(function(err) {
			if(!err)
				connected = true;
			
			callback(err);
		});
}

var prepareSync = function(options, callback) {
	connect(function(err) {
		if(err)
			callback(err);
		else
			listRemoteFiles(options.remotePath, function(err, remoteFiles) {
				if(err) callback(err)
				else listLocalFiles(options.localPath, function(err, localFiles) {
					if(err) callback(err)
					else prepareSyncObject(remoteFiles, localFiles, options, callback);
				})
			});
	});
}

var executeSync = function(sync, callback) {
	
}

var ftpConfig;
var helper = {
	prepareSync: prepareSync,
	executeSync: executeSync,
	onPrepareRemoteProgress: function(callback) {
		onPrepareRemoteProgress = callback;
	},
	opPrepareLocalProgress: function(callback) {
		onPrepareLocalProgress = callback;
	}
}

module.exports = function(ftpconfig) {
	
	//check for config change :)
	
	if(!connected)
		ftp = Ftp.create({
			host: ftpconfig.host,
			port: ftpconfig.port,
			user: ftpconfig.username,
			pass: ftpconfig.password,
		}, false);
	
	ftpConfig = ftpconfig;
	
	return helper;
}