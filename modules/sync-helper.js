var fs = require("fs");
var path = require("path");
var upath = require("upath");
var mkdirp = require("mkdirp");
var readdir = require('recursive-readdir');
var _ = require('lodash');
var Ftp = require('ftpimp');

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
			});
			result = _.sortBy(result, function(item) { return item.name });
			callback(null, result);
		}
		
		if(subdirs.length == 0) 
			finish();
		else
			subdirs.forEach(function(subdir) {
				var subPath = upath.toUnix(path.join(remotePath, subdir.filename));
				listRemoteFiles(subPath, function(err, subResult) {
					if(err) { callback(err); return; }
					result = _.union(result, subResult)	
					subdirs.splice(subdirs.indexOf(subdir), 1);
					if(subdirs.length == 0)
						finish();
				}, originalRemotePath);
			});
	});
}

var listLocalFiles = function(localPath, callback) {
	readdir(localPath, function(err, localFiles) {
		if(err) { callback(err); return; }
		var result = [];
		if(localFiles.length == 0)
			callback(null, result);
		localFiles.forEach(function(localFile) {
			fs.stat(localFile, function(err, stats) {
				if(err) { callback(err); return; }
				localFiles.splice(localFiles.indexOf(localFile), 1);
				result.push({ name: localFile, size: stats.size, isDir: false });
				if(path.dirname(localFile) != localPath)
					result.push({ name: path.dirname(localFile), isDir: true });
				if(localFiles.length == 0) {
					result.forEach(function(item) { item.name = upath.toUnix(item.name.replace(localPath, "")).substr(1); });
					result.forEach(function(item) { 
						item.name = upath.toUnix(item.name.replace(localPath, "")); 
						if(item.name[0] == "/") item.name = item.name.substr(1); 
					});
					result = _.sortBy(result, function(item) { return item.name });
					result = _.uniq(result, true, function(item) { return item.name });
					result.splice(result.indexOf("", 1));
					callback(null, result);
				}
			});
		});
	});
}

var prepareSyncObject = function(remoteFiles, localFiles, options, callback) {

	var from = options.upload ? localFiles : remoteFiles;
	var to = options.upload ? remoteFiles : localFiles;

	var filesToUpdate = [];
	var filesToAdd = [];
	var dirsToAdd = [];
	var filesToRemove = [];
	var dirsToRemove = [];
	
	from.forEach(function(fromFile) {
		var toEquivalent = to.find(function(toFile) { return toFile.name == fromFile.name });
		if(!toEquivalent && !fromFile.isDir) filesToAdd.push(fromFile.name);
		if(!toEquivalent && fromFile.isDir) dirsToAdd.push(fromFile.name);
		if(toEquivalent) toEquivalent.wasOnFrom = true;
		if(toEquivalent && toEquivalent.size != fromFile.size)
			filesToUpdate.push(fromFile.name);	
	});

	to.filter(function(toFile) { return !toFile.wasOnFrom })
		.forEach(function(toFile) {
			if(toFile.isDir)
				dirsToRemove.push(toFile.name)
			else
				filesToRemove.push(toFile.name);
		});

	callback(null, {
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

var prepareSync = function(options, callback) {
	ftp.connect(function() {
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

var helper = {
	prepareSync: prepareSync,
	executeSync: executeSync
}

module.exports = function(ftpconfig) {
	ftp = Ftp.create({
		host: ftpconfig.host,
		port: ftpconfig.port,
		user: ftpconfig.username,
		pass: ftpconfig.password,
	}, false);
	
	return helper;
}