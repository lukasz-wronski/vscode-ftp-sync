var fs = require("fs");
var path = require("path");
var upath = require("upath");
var mkdirp = require("mkdirp");
var fswalk = require('fs-walk');
var _ = require('lodash');
var isIgnored = require('./is-ignored');
var output = require("./output");
var FtpWrapper = require("./ftp-wrapper");
var SftpWrapper = require("./sftp-wrapper");

var ftp;

//add options 
var listRemoteFiles = function(remotePath, callback, originalRemotePath, options) {
    output("[sync-helper] listRemoteFiles");
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
			//when listing remoteFiles by onPrepareRemoteProgress, ignore remoteFiles
			if (isIgnored(ftpConfig.ignore, path.join(options.remotePath, fileInfo.name))) return;

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
                if(_.startsWith(item.name, originalRemotePath))
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
			}, originalRemotePath, options);
		}
		
		if(subdirs.length == 0) 
			finish();
		else
			listNextSubdir();
	});
}

//add options 
var listLocalFiles = function(localPath, callback, options) {
    output("[sync-helper] listLocalFiles");
	var files = [];
	fswalk.walk(localPath, function(basedir, filename, stat, next) {
		var filePath = path.join(basedir, filename);
		//when listing localFiles by onPrepareLocalProgress, ignore localfile
		if (isIgnored(ftpConfig.ignore, filePath)) return next();

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
    output("[sync-helper] prepareSyncObject");
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
        _warning: "This file should not be saved, reopened review file won't work!",
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
    output("[sync-helper] connect");
	if(connected == false)
	{
		ftp.connect(ftpConfig);
		ftp.onready(function() { 
            connected = true; 
            if(!ftpConfig.passive && ftpConfig.protocol != "sftp")
                callback(); 
            else if(ftpConfig.protocol == "sftp")
                ftp.goSftp(callback);
            else if(ftpConfig.passive)
                ftp.pasv(callback);
        });
		ftp.onerror(callback);
        ftp.onclose(function(err) {
            output("[sync-helper] connClosed");
            connected = false;
        });
	}
	else 
		callback();
}


var prepareSync = function(options, callback) {
    output("[sync-helper] prepareSync");
	connect(function(err) {
		if(err) callback(err);
		else listRemoteFiles(options.remotePath, function(err, remoteFiles) {
			if(err) callback(err);
			else listLocalFiles(options.localPath, function(err, localFiles) {
				if(err) callback(err);
				else prepareSyncObject(remoteFiles, localFiles, options, callback);
			}, options)
		}, null, options);
	});
}


var executeSyncLocal = function(sync, options, callback) {
	output("[sync-helper] executeSyncLocal");
	if(onSyncProgress != null)
		onSyncProgress(sync.startTotal - totalOperations(sync), sync.startTotal);
	
	var replaceFile = function(fileToReplace) {
		var local = path.join(options.localPath, fileToReplace);
		var remote = upath.toUnix(path.join(options.remotePath, fileToReplace));
		ftp.get(remote, local, function(err) {
			if(err) callback(err);
            else executeSyncLocal(sync, options, callback);
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
		var dirToRemove = sync.dirsToRemove.pop();
		var localPath = path.join(options.localPath, dirToRemove);
		fs.rmdir(localPath, function(err) {
			if(err) callback(err); else executeSyncLocal(sync, options, callback);
		});
	} else {
		callback();
	}
}

var executeSyncRemote = function(sync, options, callback) {
	output("[sync-helper] executeSyncRemote");
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
		var dirToAdd = sync.dirsToAdd.shift();	
		var remotePath = upath.toUnix(path.join(options.remotePath, dirToAdd));
		ftp.mkdir(remotePath, function(err) {
			if(err) callback(err); else executeSyncRemote(sync, options, callback);
		})
	} else if(sync.filesToAdd.length > 0) {
		var fileToAdd = sync.filesToAdd.shift();
		replaceFile(fileToAdd);
	} else if(sync.filesToUpdate.length > 0) {
		var fileToUpdate = sync.filesToUpdate.shift();
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
		ftp.rmdir(remotePath, function(err) {
			if(err) callback(err); else executeSyncRemote(sync, options, callback);
		});
	} else {
		callback();
	}
}

var ensureDirExists = function(remoteDir, callback) {
    ftp.list(path.posix.join(remoteDir, ".."), function(err, list) {
        if(err)
            ensureDirExists(path.posix.join(remoteDir, ".."), function() {
                ensureDirExists(remoteDir, callback);
            });
        else if(_.any(list, f => f.name == path.basename(remoteDir)))
            callback();
        else
            ftp.mkdir(remoteDir, function(err) {
                if(err) callback(err)
                else callback();
            })
    });
}

var uploadFile = function(localPath, rootPath, callback) {
    output("[sync-helper] uploadFile");
	var remotePath = upath.toUnix(path.join(ftpConfig.remote, localPath.replace(rootPath, '')));
	var remoteDir = upath.toUnix(path.dirname(remotePath));
	connect(function(err) {
        if(err) callback(err);
        var putFile = function() {
            ftp.put(localPath, remotePath, function(err) {
			     callback(err);
			})
        }
        if(remoteDir != ".")
            ensureDirExists(remoteDir, function(err) {
                if(err) callback(err);
                else putFile();
            })
         else
            putFile();
	})
}

var executeSync = function(sync, options, callback) {
    output("[sync-helper] executeSync");
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
        if(!ftpConfig || ftpConfig.protocol != config.protocol)
            ftp = config.protocol == "sftp" ? new SftpWrapper() : new FtpWrapper();
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
	return helper;
}