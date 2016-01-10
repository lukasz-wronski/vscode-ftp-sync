var fs = require("fs");
var path = require("path");
var upath = require("upath");
var mkdirp = require("mkdirp");
var fswalk = require('fs-walk');
var _ = require('lodash');
var Ftp = require('ftp');
var saveTo = require('save-to');
var isIgnored = require('./is-ignored');

var ftp = new Ftp();

var listRemoteFiles = function(remotePath, callback, originalRemotePath) {
	remotePath = upath.toUnix(remotePath);
	if(!originalRemotePath)
		originalRemotePath = remotePath;
	ftp.list(remotePath, function(err, remoteFiles) {
		if(err) { 
			if(err.code == 450)
				callback(null, []);
			else
				callback(err); 
			return; 
		}
		
		var result = [];
		var subdirs = [];
		
		if(remoteFiles.length == 0)
			callback(null, result);
		
		remoteFiles.forEach(function(fileInfo) {
			if(fileInfo.name == "." || fileInfo.name == "..") return;
			var remoteItemPath = upath.toUnix(path.join(remotePath, fileInfo.name));
			if(fileInfo.type != 'd')
				result.push({ 
					name: remoteItemPath, 
					size: fileInfo.size,
					isDir: false
				})
			else if(fileInfo.type == 'd') {
				subdirs.push(fileInfo);
				result.push({ name: remoteItemPath, isDir: true });
			}
		});
		
		var finish = function() {
			result.forEach(function(item) { 
                if(_.startsWith(originalRemotePath, item.name))
				    item.name = item.name.replace(originalRemotePath, ""); 
				if(item.name[0] == "/") item.name = item.name.substr(1);
				if(onPrepareRemoteProgress) onPrepareRemoteProgress(item.name);
			});
			result = _.sortBy(result, function(item) { return item.name });
			callback(null, result);
		}
		
		var listNextSubdir = function() {
			var subdir = subdirs.pop();
			var subPath = upath.toUnix(path.join(remotePath, subdir.name));
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
        return isIgnored(ftpConfig.ignore, path.join(options.remotePath, file.name));
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
			if(toEquivalent && toEquivalent.size != fromFile.size && !fromFile.isDir)
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
		dirsToRemove: dirsToRemove
	});
}

var totalOperations = function(sync) {
	return sync.filesToUpdate.length
		+ sync.filesToAdd.length
		+ sync.dirsToAdd.length 
		+ sync.filesToRemove.length 
		+ sync.dirsToRemove.length 
}

var onPrepareRemoteProgress, onPrepareLocalProgress, onSyncProgress;
var connected = false;

var connect = function(callback) {
	if(connected == false)
	{
		ftp.connect(ftpConfig);
		ftp.once('ready', function() { 
            connected = true; 
            if(!ftpConfig.passive)
                callback(); 
            else
                ftp._send("PASV", callback);
        });
		ftp.once('error', callback);
	}
	else 
		callback();
}


var prepareSync = function(options, callback) {
	connect(function(err) {
		if(err) callback(err);
		else listRemoteFiles(options.remotePath, function(err, remoteFiles) {
			if(err) callback(err);
			else listLocalFiles(options.localPath, function(err, localFiles) {
				if(err) callback(err);
				else prepareSyncObject(remoteFiles, localFiles, options, callback);
			})
		});
	});
}


var executeSyncLocal = function(sync, options, callback) {
	
	if(onSyncProgress != null)
		onSyncProgress(sync.startTotal - totalOperations(sync), sync.startTotal);
	
	var replaceFile = function(fileToReplace) {
		var local = path.join(options.localPath, fileToReplace);
		var remote = upath.toUnix(path.join(options.remotePath, fileToReplace));
		ftp.get(remote, function(err, stream) {
			if(err) callback(err);
			else saveTo(stream, local, function(err) {
				if(err) callback(err); else executeSyncLocal(sync, options, callback);
			});
		});
	}
	
	if(sync.dirsToAdd.length > 0) {
		var dirToAdd = sync.dirsToAdd.pop();	
		var localPath = path.join(options.localPath, dirToAdd);
		mkdirp(localPath, function(err) {
			if(err) callback(err); else executeSyncLocal(sync, options, callback);
		});
	} else if(sync.filesToAdd.length > 0) {
		var fileToAdd = sync.filesToAdd.pop();
		replaceFile(fileToAdd);
	} else if(sync.filesToUpdate.length > 0) {
		var fileToUpdate = sync.filesToUpdate.pop();
		replaceFile(fileToUpdate);
	} else if(sync.filesToRemove.length > 0) {
		var fileToRemove = sync.filesToRemove.pop();
		var localPath = path.join(options.localPath, fileToRemove);
		fs.unlink(localPath, function(err) {
			if(err) callback(err); else executeSyncLocal(sync, options, callback);
		});
	} else if(sync.dirsToRemove.length > 0) {
		var dirToRemove = sync.dirToRemove.pop();
		var localPath = path.join(options.localPath, dirToRemove);
		fs.rmdir(localPath, function(err) {
			if(err) callback(err); else executeSyncLocal(sync, options, callback);
		});
	} else {
		callback();
	}
}

var executeSyncRemote = function(sync, options, callback) {
	
	if(onSyncProgress != null)
		onSyncProgress(sync.startTotal - totalOperations(sync), sync.startTotal);
	
	var replaceFile = function(fileToReplace) {
		var local = path.join(options.localPath, fileToReplace);
		var remote = upath.toUnix(path.join(options.remotePath, fileToReplace));
		ftp.put(local, remote, function(err) {
			if(err) callback(err); else executeSyncRemote(sync, options, callback);
		});
	}
	
	if(sync.dirsToAdd.length > 0) {
		var dirToAdd = sync.dirsToAdd.pop();	
		var remotePath = upath.toUnix(path.join(options.remotePath, dirToAdd));
		ftp.mkdir(remotePath, true, function(err) {
			if(err) callback(err); else executeSyncRemote(sync, options, callback);
		})
	} else if(sync.filesToAdd.length > 0) {
		var fileToAdd = sync.filesToAdd.pop();
		replaceFile(fileToAdd);
	} else if(sync.filesToUpdate.length > 0) {
		var fileToUpdate = sync.filesToUpdate.pop();
		replaceFile(fileToUpdate);
	} else if(sync.filesToRemove.length > 0) {
		var fileToRemove = sync.filesToRemove.pop();
		var remotePath = upath.toUnix(path.join(options.remotePath, fileToRemove));
		ftp.delete(remotePath, function(err) {
			if(err) callback(err); else executeSyncRemote(sync, options, callback);
		});
	} else if(sync.dirsToRemove.length > 0) {
		var dirToRemove = sync.dirsToRemove.pop();
		var remotePath = upath.toUnix(path.join(options.remotePath, dirToRemove));
		ftp.rmdir(remotePath, true, function(err) {
			if(err) callback(err); else executeSyncRemote(sync, options, callback);
		});
	} else {
		callback();
	}
}

var uploadFile = function(localPath, rootPath, callback) {
	var remotePath = upath.toUnix(path.join(ftpConfig.remote, localPath.replace(rootPath, '')));
	var remoteDir = upath.toUnix(path.dirname(remotePath));
	connect(function(err) {
		if(err) callback(err);
		else ftp.list(remoteDir, function(err) {
			if(!err) {
				ftp.put(localPath, remotePath, function(err) {
					callback(err);
				})
			} else if(err.code == 450) {
				ftp.mkdir(remoteDir, true, function(err) {
					if(err) callback(err)
					else ftp.put(localPath, remotePath, function(err) {
						callback(err);
					})
				})
			} else
				callback(err)
		});
	})
}

var executeSync = function(sync, options, callback) {
	sync.startTotal = totalOperations(sync);
	connect(function(err) {
		if(err) callback(err);
		else if(options.upload) 
			executeSyncRemote(sync, options, callback);
		else
			executeSyncLocal(sync, options, callback);
	});
}

var ftpConfig;
var helper = {
	useConfig: function(config) {
		ftpConfig = config;
	},
	getConfig: function() {
		return ftpConfig;
	},
	prepareSync: prepareSync,
	executeSync: executeSync,
	totalOperations: totalOperations,
	uploadFile: uploadFile,
	disconnect: function() {
		ftp.end();
	},
	onPrepareRemoteProgress: function(callback) {
		onPrepareRemoteProgress = callback;
	},
	onPrepareLocalProgress: function(callback) {
		onPrepareLocalProgress = callback;
	},
	onSyncProgress: function(callback) {
		onSyncProgress = callback;
	}
}

module.exports = function(config) {
	ftp.on('close', function(err) {
		connected = false;
	});
	
	return helper;
}