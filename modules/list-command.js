/* global STATUS_TIMEOUT */
const vscode = require('vscode');
const ftpconfig = require('./ftp-config');
const path = require('path');
const isIgnored = require('./is-ignored');
const output = require('./output');
const downloadFn = require('./downloadcurrent-command');
const uploadFn = require('./uploadcurrent-command');

module.exports = function(fileUrl, getFtpSync) {
	var filePath = fileUrl ? fileUrl.fsPath : undefined;

	//We aren't getting a file, trying to take the current one
	if(!filePath) {
		filePath = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.fileName : undefined;
	}

	if(!filePath) {
		vscode.window.showErrorMessage("Ftp-sync: No file selected");
		return;
	}

  if (!ftpconfig.rootPath()) {
    vscode.window.showErrorMessage('Ftp-sync: Cannot init ftp-sync without opened folder');
    return;
  }

  if (filePath.indexOf(ftpconfig.rootPath()) < 0) {
    vscode.window.showErrorMessage('Ftp-sync: Selected file is not a part of the workspace.');
    return;
  }

  var config = ftpconfig.getConfig();
  if (isIgnored(filePath, config.allow, config.ignore)) {
    vscode.window.showErrorMessage('Ftp-sync: Selected file is ignored.');
    return;
  }

  let remotePath = getFatherPath(filePath.replace(ftpconfig.rootPath(), config.remotePath));
  function listAllFiles(filesRemotePath) {
    getFtpSync().ListRemoteFilesByPath(filesRemotePath, function(err, files) {
      if (err) {
        // console.error('err:', err);
        vscode.window.showErrorMessage('Ftp-sync: Listing failed: ' + err);
      } else {
        vscode.window.setStatusBarMessage('Ftp-sync: Listing successfully!', STATUS_TIMEOUT);
        // console.log('files:', files);
        showFiles(files, filesRemotePath);
      }
    });
  }
  function deleteFn(filePath) {
    getFtpSync().deleteRemoteFile(filePath).then(function(result) {
      vscode.window.setStatusBarMessage('Ftp-sync: Delete successfully!', STATUS_TIMEOUT);
    }).catch(err => {
      vscode.window.showErrorMessage('Ftp-sync: Delete failed: ' + err);
    })
  }
  listAllFiles(remotePath);
  // show remotePath files
  function showFiles(files, filesRemotePath) {
    const pickOptions = files.map(file => ({label: getLabel(file), description: file.path, file, isDir: file.isDir}));
    const pickResult = vscode.window.showQuickPick([
      {
        label: '../',
        description: '. UP a folder',
        backPath: getFatherPath(filesRemotePath)
      }
    ].concat(pickOptions), {placeHolder: 'Select a folder or file'});

    pickResult.then(function(result) {
      if (!result) {
        return;
      }
      // console.log('sel file:', result);
      if (result.backPath) {
        listAllFiles(result.backPath);
      } else if (result.isDir) {
        listAllFiles(result.file.path);
      } else {
        showFileActions(result.file);
      }
    });
  }
  // show Actions
  function showFileActions(file) {
    const pickOptions = [
      {
        label: '../',
        description: '. UP a folder',
        backPath: getFatherPath(file.path)
      }, {
        label: 'DownLoad',
        description: 'DownLoad this file',
        file,
        action: 'download'
      }, {
        label: 'Upload',
        description: 'Upload this file',
        file,
        action: 'upload'
      }, {
        label: 'Delete',
        description: 'Delete this file',
        file,
        action: 'delete'
      }
    ];
    const pickResult = vscode.window.showQuickPick(pickOptions);

    pickResult.then(function(result) {
      // console.log('sel Actions:', result);
      if (!result) {
        return;
      }
      if (result.backPath) {
        listAllFiles(result.backPath);
      } else if (result.action === 'download') {
        downloadFn(getLocalPath(result.file.path), getFtpSync);
      } else if (result.action === 'upload') {
        uploadFn(getLocalPath(result.file.path), getFtpSync);
      } else if (result.action === 'delete') {
        deleteFn(result.file.path);
      }
    });
  }
};
function getLabel(file) {
  const name = file.name && file.name.indexOf('/') === 0
    ? file.name.slice(1)
    : file.name;
  return file.isDir
    ? `${name}/`
    : name

}
function getLocalPath(fileRemotePath) {
  return {
    fsPath: fileRemotePath.replace(ftpconfig.getConfig().remotePath, ftpconfig.rootPath())
  };
}
function getFatherPath(son) {
  let father = son.split('/');
  father = father.slice(0, father.length - 1).join('/');
  return father;
}
