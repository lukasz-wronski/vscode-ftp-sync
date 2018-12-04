var fs = require("fs");
var path = require("path");
var upath = require("upath");
var mkdirp = require("mkdirp");
var fswalk = require("fs-walk");
var _ = require("lodash");
var isIgnored = require("./is-ignored");
var output = require("./output");
var FtpWrapper = require("./ftp-wrapper");
var SftpWrapper = require("./sftp-wrapper");
var ScpWrapper = require("./scp-wrapper");
var vscode = require("vscode");

var ftp;

// This are the uncompleted requests.
var openListRemoteFilesRequests = 0;

// get timestamp
var getCurrentTime = function() {
  var currentdate = new Date();

  return (
    currentdate.getDate() +
    "/" +
    (currentdate.getMonth() + 1) +
    "/" +
    currentdate.getFullYear() +
    " @ " +
    currentdate.getHours() +
    ":" +
    currentdate.getMinutes() +
    ":" +
    currentdate.getSeconds()
  );
};

//add options
var listRemoteFiles = function(
  remotePath,
  callback,
  originalRemotePath,
  options
) {
  output(getCurrentTime() + " > [ftp-sync] listRemoteFiles: " + remotePath);
  remotePath = upath.toUnix(remotePath);
  if (!originalRemotePath) {
    originalRemotePath = remotePath;

    // Overwrite original callback to execute only if all open request are finish
    var oldCallback = callback;
    callback = function(error, result) {
      if (openListRemoteFilesRequests === 0) {
        oldCallback(error, result);
      }
    };
  }

  // Add a new open request
  openListRemoteFilesRequests += 1;

  ftp.list(remotePath, function(err, remoteFiles) {
    // The request is finish so remove it
    openListRemoteFilesRequests -= 1;

    if (err) {
      if (err.code == 450) callback(null, []);
      else callback(err);
      return;
    }

    var result = [];
    var subdirs = [];

    if (remoteFiles.length == 0) callback(null, result);

    remoteFiles.forEach(function(fileInfo) {
      //when listing remoteFiles by onPrepareRemoteProgress, ignore remoteFiles
      if (
        isIgnored(
          path.join(remotePath, fileInfo.name),
          ftpConfig.allow,
          ftpConfig.ignore
        )
      )
        return;

      if (fileInfo.name == "." || fileInfo.name == "..") return;
      var remoteItemPath = upath.toUnix(path.join(remotePath, fileInfo.name));
      if (fileInfo.type != "d")
        result.push({
          name: remoteItemPath,
          size: fileInfo.size,
          isDir: false
        });
      else if (fileInfo.type == "d") {
        subdirs.push(fileInfo);
        result.push({
          name: remoteItemPath,
          isDir: true
        });
      }
    });
    var finish = function() {
      result.forEach(function(item) {
        if (_.startsWith(item.name, originalRemotePath))
          item.name = item.name.replace(originalRemotePath, "");
        if (item.name[0] == "/") item.name = item.name.substr(1);
        if (onPrepareRemoteProgress) onPrepareRemoteProgress(item.name);
      });
      result = _.sortBy(result, function(item) {
        return item.name;
      });
      callback(null, result);
    };

    var listNextSubdir = function() {
      var subdir = subdirs.shift();
      var subPath = upath.toUnix(path.join(remotePath, subdir.name));
      listRemoteFiles(
        subPath,
        function(err, subResult) {
          if (err) {
            callback(err);
            return;
          }
          result = _.union(result, subResult);
          if (subdirs.length == 0) finish();
          else listNextSubdir();
        },
        originalRemotePath,
        options
      );
    };

    if (subdirs.length == 0) finish();
    else listNextSubdir();
  });
};
// list remote files, deep = 1
const listOneDeepRemoteFiles = function(remotePath, callback) {
  output(getCurrentTime() + " > [ftp-sync] listRemoteFiles: " + remotePath);
  remotePath = upath.toUnix(remotePath);
  ftp.list(remotePath, function(err, remoteFiles) {
    if (err) {
      if (err.code == 450) callback(null, []);
      else callback(err);
      return;
    }

    let result = [];

    if (remoteFiles.length == 0) {
      callback(null, result);
      return;
    }

    remoteFiles.forEach(function(fileInfo) {
      // when listing remoteFiles by onPrepareRemoteProgress, ignore remoteFiles
      if (
        isIgnored(
          path.join(remotePath, fileInfo.name),
          ftpConfig.allow,
          ftpConfig.ignore
        )
      )
        return;

      if (fileInfo.name == "." || fileInfo.name == "..") return;
      var remoteItemPath = upath.toUnix(path.join(remotePath, fileInfo.name));
      if (fileInfo.type != "d")
        result.push({
          name: remoteItemPath,
          size: fileInfo.size,
          isDir: false
        });
      else if (fileInfo.type == "d") {
        result.push({
          name: remoteItemPath,
          isDir: true
        });
      }
    });
    const finish = () => {
      result.forEach(function(item) {
        if (_.startsWith(item.name, remotePath)) {
          item.path = item.name;
          item.name = item.name.replace(remotePath, "");
        }
      });
      result = _.sortBy(result, function(item) {
        return item.name;
      });
      callback(null, result);
    };
    finish();
  });
};
// the entry of list request
const ListRemoteFilesByPath = function(remotePath, callback) {
  connect(err => {
    if (err) {
      callback(err);
      return;
    }
    listOneDeepRemoteFiles(remotePath, callback);
  });
};
const deleteRemoteFile = function(remoteFilePath) {
  return new Promise(function(resolve, reject) {
    connect(err => {
      if (err) {
        reject(err);
        return;
      }
      output(
        getCurrentTime() + " > [ftp-sync] deletRemoteFile: " + remoteFilePath
      );
      ftp.delete(remoteFilePath, function(err) {
        if (err) reject(err);
        else
          resolve({
            success: true,
            path: remoteFilePath
          });
      });
    });
  });
};
//add options
var listLocalFiles = function(localPath, rootPath, callback, options) {
  output(getCurrentTime() + " > [ftp-sync] listLocalFiles:" + localPath);

  var files = [];

  if (localPath != rootPath) {
    fswalk.dirs(
      localPath,
      function(basedir, filename, stat, next) {
        var dirPath = path.join(basedir, filename);
        if (isIgnored(dirPath, ftpConfig.allow, ftpConfig.ignore))
          return next();
        dirPath = dirPath.replace(localPath, "");
        dirPath = upath.toUnix(dirPath);
        if (dirPath[0] == "/") dirPath = dirPath.substr(1);
        if (onPrepareLocalProgress) onPrepareLocalProgress(dirPath);
        files.push({
          name: dirPath,
          size: stat.size,
          isDir: stat.isDirectory()
        });
        next();
      },
      function(err) {
        callback(err, files);
      }
    );
    fswalk.files(
      localPath,
      function(basedir, filename, stat, next) {
        var filePath = path.join(basedir, filename);
        //when listing localFiles by onPrepareLocalProgress, ignore localfile
        if (isIgnored(filePath, ftpConfig.allow, ftpConfig.ignore))
          return next();
        filePath = filePath.replace(localPath, "");
        filePath = upath.toUnix(filePath);
        if (filePath[0] == "/") filePath = filePath.substr(1);

        if (onPrepareLocalProgress) onPrepareLocalProgress(filePath);
        files.push({
          name: filePath,
          size: stat.size,
          isDir: stat.isDirectory()
        });
        next();
      },
      function(err) {
        callback(err, files);
      }
    );
  }
  if (localPath === rootPath) {
    fswalk.walk(
      localPath,
      function(basedir, filename, stat, next) {
        var filePath = path.join(basedir, filename);
        //when listing localFiles by onPrepareLocalProgress, ignore localfile
        if (isIgnored(filePath, ftpConfig.allow, ftpConfig.ignore))
          return next();
        filePath = filePath.replace(localPath, "");
        filePath = upath.toUnix(filePath);
        if (filePath[0] == "/") filePath = filePath.substr(1);

        if (onPrepareLocalProgress) onPrepareLocalProgress(filePath);
        files.push({
          name: filePath,
          size: stat.size,
          isDir: stat.isDirectory()
        });
        next();
      },
      function(err) {
        callback(err, files);
      }
    );
  }
};

var prepareSyncObject = function(remoteFiles, localFiles, options, callback) {
  var from = options.upload ? localFiles : remoteFiles;
  var to = options.upload ? remoteFiles : localFiles;

  var skipIgnores = function(file) {
    return isIgnored(
      path.join(options.remotePath, file.name),
      ftpConfig.allow,
      ftpConfig.ignore
    );
  };

  _.remove(from, skipIgnores);
  _.remove(to, skipIgnores);

  var filesToUpdate = [];
  var filesToAdd = [];
  var dirsToAdd = [];
  var filesToRemove = [];
  var dirsToRemove = [];

  if (options.mode == "force")
    from.forEach(function(fromFile) {
      var toEquivalent = to.find(function(toFile) {
        return toFile.name == fromFile.name;
      });
      if (toEquivalent && !fromFile.isDir) filesToUpdate.push(fromFile.name);
      if (!toEquivalent) {
        if (fromFile.isDir) dirsToAdd.push(fromFile.name);
        else filesToAdd.push(fromFile.name);
      }
    });
  else
    from.forEach(function(fromFile) {
      var toEquivalent = to.find(function(toFile) {
        return toFile.name == fromFile.name;
      });
      if (!toEquivalent && !fromFile.isDir) filesToAdd.push(fromFile.name);
      if (!toEquivalent && fromFile.isDir) dirsToAdd.push(fromFile.name);
      if (toEquivalent) toEquivalent.wasOnFrom = true;
      if (toEquivalent && toEquivalent.size != fromFile.size && !fromFile.isDir)
        filesToUpdate.push(fromFile.name);
    });

  if (options.mode == "full")
    to.filter(toFile => {
      return !toFile.wasOnFrom;
    }).forEach(toFile => {
      if (toFile.isDir) dirsToRemove.push(toFile.name);
      else filesToRemove.push(toFile.name);
    });

  callback(null, {
    _readMe:
      "Review list of sync operations, then use Ftp-sync: Commit command to accept changes. Note that if you're not in your root directory then all the parent directories will also be uploaded",
    _warning: "This file should not be saved, reopened review file won't work!",
    filesToUpdate: filesToUpdate,
    filesToAdd: filesToAdd,
    dirsToAdd: dirsToAdd,
    filesToRemove: filesToRemove,
    dirsToRemove: dirsToRemove
  });
};

var totalOperations = function(sync) {
  return (
    sync.filesToUpdate.length +
    sync.filesToAdd.length +
    sync.dirsToAdd.length +
    sync.filesToRemove.length +
    sync.dirsToRemove.length
  );
};

var onPrepareRemoteProgress, onPrepareLocalProgress, onSyncProgress;
var connected = false;
var connect = function(callback) {
  output(getCurrentTime() + " > [sync-helper] connect");
  if (connected == false) {
    // If password and private key path are required but missing from the
    // config file, prompt the user for a password and then connect
    if (
      ((ftpConfig.protocol == "sftp" || ftpConfig.protocol == "scp") &&
        !ftpConfig.password &&
        !ftpConfig.privateKeyPath) ||
      !ftpConfig.password
    ) {
      vscode.window
        .showInputBox({
          prompt: '[ftp-sync] Password for "' + ftpConfig.host + '"',
          password: true
        })
        .then(function(password) {
          ftp.connect(
            Object.assign({}, ftpConfig, {
              password: password
            })
          );
        });
    } else {
      // Otherwise just connect
      ftp.connect(ftpConfig);
    }

    ftp.onready(function() {
      connected = true;
      if (!ftpConfig.passive && ftpConfig.protocol != "sftp") callback();
      else if (ftpConfig.protocol == "sftp") ftp.goSftp(callback);
      else if (ftpConfig.passive) ftp.pasv(callback);
    });
    ftp.onerror(callback);
    ftp.onclose(function(err) {
      output(getCurrentTime() + " > [ftp-sync] connection closed");
      connected = false;
    });
  } else callback();
};

var prepareSync = function(options, callback) {
  connect(function(err) {
    if (err) callback(err);
    else
      listRemoteFiles(
        options.remotePath,
        function(err, remoteFiles) {
          if (err) callback(err);
          else
            listLocalFiles(
              options.localPath,
              options.rootPath,
              function(err, localFiles) {
                if (err) callback(err);
                else
                  prepareSyncObject(remoteFiles, localFiles, options, callback);
              },
              options
            );
        },
        null,
        options
      );
  });
};

var executeSyncLocal = function(sync, options, callback) {
  if (onSyncProgress != null)
    onSyncProgress(sync.startTotal - totalOperations(sync), sync.startTotal);

  var replaceFile = function(fileToReplace) {
    var local = path.join(options.localPath, fileToReplace);
    var remote = upath.toUnix(path.join(options.remotePath, fileToReplace));

    output(getCurrentTime() + " > [ftp-sync] syncLocal replace: " + remote);

    ftp.get(remote, local, function(err) {
      if (err) callback(err);
      else executeSyncLocal(sync, options, callback);
    });
  };

  if (sync.dirsToAdd.length > 0) {
    var dirToAdd = sync.dirsToAdd.pop();
    var localPath = path.join(options.localPath, dirToAdd);

    output(getCurrentTime() + " > [ftp-sync] syncLocal createDir: " + dirToAdd);

    mkdirp(localPath, function(err) {
      if (err) callback(err);
      else executeSyncLocal(sync, options, callback);
    });
  } else if (sync.filesToAdd.length > 0) {
    var fileToAdd = sync.filesToAdd.pop();
    replaceFile(fileToAdd);
  } else if (sync.filesToUpdate.length > 0) {
    var fileToUpdate = sync.filesToUpdate.pop();
    replaceFile(fileToUpdate);
  } else if (sync.filesToRemove.length > 0) {
    var fileToRemove = sync.filesToRemove.pop();
    var localPath = path.join(options.localPath, fileToRemove);

    output(
      getCurrentTime() + " > [ftp-sync] syncLocal removeFile: " + fileToRemove
    );

    fs.unlink(localPath, function(err) {
      if (err) callback(err);
      else executeSyncLocal(sync, options, callback);
    });
  } else if (sync.dirsToRemove.length > 0) {
    var dirToRemove = sync.dirsToRemove.pop();
    var localPath = path.join(options.localPath, dirToRemove);

    output(getCurrentTime() + " > [ftp-sync] syncLocal removeDir: " + dirToAdd);

    fs.rmdir(localPath, function(err) {
      if (err) callback(err);
      else executeSyncLocal(sync, options, callback);
    });
  } else {
    callback();
  }
};

var executeSyncRemote = function(sync, options, callback) {
  if (onSyncProgress != null)
    onSyncProgress(sync.startTotal - totalOperations(sync), sync.startTotal);

  var replaceFile = function(fileToReplace) {
    var local = path.join(options.localPath, fileToReplace);
    var remote = upath.toUnix(path.join(options.remotePath, fileToReplace));

    output(getCurrentTime() + " > [ftp-sync] syncRemote replace: " + local);

    ftp.put(local, remote, function(err) {
      if (err) callback(err);
      else executeSyncRemote(sync, options, callback);
    });
  };

  if (sync.dirsToAdd.length > 0) {
    var dirToAdd = sync.dirsToAdd.shift();
    var remotePath = upath.toUnix(path.join(options.remotePath, dirToAdd));

    output(
      getCurrentTime() + " > [ftp-sync] syncRemote createDir: " + dirToAdd
    );

    ftp.mkdir(
      remotePath,
      function(err) {
        if (err) callback(err);
        else executeSyncRemote(sync, options, callback);
      },
      true
    );
  } else if (sync.filesToAdd.length > 0) {
    var fileToAdd = sync.filesToAdd.shift();
    replaceFile(fileToAdd);
  } else if (sync.filesToUpdate.length > 0) {
    var fileToUpdate = sync.filesToUpdate.shift();
    replaceFile(fileToUpdate);
  } else if (sync.filesToRemove.length > 0) {
    var fileToRemove = sync.filesToRemove.pop();
    var remotePath = upath.toUnix(path.join(options.remotePath, fileToRemove));

    output(
      getCurrentTime() + " > [ftp-sync] syncRemote removeFile: " + fileToRemove
    );

    ftp.delete(remotePath, function(err) {
      if (err) callback(err);
      else executeSyncRemote(sync, options, callback);
    });
  } else if (sync.dirsToRemove.length > 0) {
    var dirToRemove = sync.dirsToRemove.pop();
    var remotePath = upath.toUnix(path.join(options.remotePath, dirToRemove));

    output(
      getCurrentTime() + " > [ftp-sync] syncRemote removeDir: " + dirToRemove
    );

    ftp.rmdir(remotePath, function(err) {
      if (err) callback(err);
      else executeSyncRemote(sync, options, callback);
    });
  } else {
    callback();
  }
};

var ensureDirExists = function(remoteDir, callback) {
  ftp.list(path.posix.join(remoteDir, ".."), function(err, list) {
    if (err) {
      ensureDirExists(path.posix.join(remoteDir, ".."), function() {
        ensureDirExists(remoteDir, callback);
      });
    } else if (_.some(list, f => f.name == path.basename(remoteDir))) {
      callback();
    } else {
      ftp.mkdir(
        remoteDir,
        err => {
          if (err) callback(err);
          else callback();
        },
        true
      );
    }
  });
};

var uploadFile = function(localPath, rootPath, callback) {
  output(
    getCurrentTime() +
      " > [sync-helper] uploading: " +
      path.parse(localPath).base
  );
  var remotePath = upath.toUnix(
    path.join(ftpConfig.remote, localPath.replace(rootPath, ""))
  );
  var remoteDir = upath.toUnix(path.dirname(remotePath));
  connect(function(err) {
    if (err) {
      callback(err);
      return;
    }
    var putFile = function() {
      ftp.put(localPath, remotePath, function(err) {
        callback(err);
      });
    };
    if (remoteDir != ".")
      ensureDirExists(remoteDir, function(err) {
        if (err) callback(err);
        else putFile();
      });
    else putFile();
  });
};

var downloadFile = function(localPath, rootPath, callback) {
  output(
    getCurrentTime() +
      " > [sync-helper] downloading: " +
      path.parse(localPath).base
  );
  var remotePath = upath.toUnix(
    path.join(ftpConfig.remote, localPath.replace(rootPath, ""))
  );
  var remoteDir = upath.toUnix(path.dirname(remotePath));
  connect(function(err) {
    if (err) callback(err);
    var getFile = function() {
      ftp.get(remotePath, localPath, function(err) {
        callback(err);
      });
    };
    if (remoteDir != ".")
      ensureDirExists(remoteDir, function(err) {
        if (err) callback(err);
        else getFile();
      });
    else getFile();
  });
};

var executeSync = function(sync, options, callback) {
  output(getCurrentTime() + " > [ftp-sync] sync starting");
  sync.startTotal = totalOperations(sync);
  connect(function(err) {
    if (err) callback(err);
    else if (options.upload) executeSyncRemote(sync, options, callback);
    else executeSyncLocal(sync, options, callback);
  });
};

var ftpConfig;
var helper = {
  useConfig: function(config) {
    if (!ftpConfig || ftpConfig.protocol != config.protocol)
      ftp =
        config.protocol == "sftp"
          ? new SftpWrapper()
          : config.protocol == "scp"
          ? new ScpWrapper()
          : new FtpWrapper();
    ftpConfig = config;
  },
  getConfig: function() {
    return ftpConfig;
  },
  prepareSync: prepareSync,
  ListRemoteFilesByPath: ListRemoteFilesByPath,
  deleteRemoteFile: deleteRemoteFile,
  executeSync: executeSync,
  totalOperations: totalOperations,
  uploadFile: uploadFile,
  downloadFile: downloadFile,
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
};

module.exports = function(config) {
  return helper;
};
