/* global STATUS_TIMEOUT */
var vscode = require('vscode');
var ftpconfig = require('./ftp-config');
var path = require('path');
var isIgnored = require('./is-ignored');
var output = require('./output');
const downloadFn = require('./downloadcurrent-command');
const UploadFn = require('./uploadcurrent-command');
module.exports = function(fileUrl, getFtpSync) {
  if (!vscode.workspace.rootPath) {
    vscode.window.showErrorMessage(
      'Ftp-sync: Cannot init ftp-sync without opened folder'
    );
    return;
  }

  if (fileUrl.fsPath.indexOf(vscode.workspace.rootPath) < 0) {
    vscode.window.showErrorMessage(
      'Ftp-sync: Selected file is not a part of the workspace.'
    );
    return;
  }

  var config = ftpconfig.getConfig();
  if (isIgnored(fileUrl.fsPath, config.allow, config.ignore)) {
    vscode.window.showErrorMessage('Ftp-sync: Selected file is ignored.');
    return;
  }

  var fileName = path.basename(fileUrl.fsPath);
  let remotePath = getFatherPath(
    fileUrl.fsPath.replace(vscode.workspace.rootPath, config.remotePath)
  );
  // console.log('remotePath:', remotePath);
  function listAllFiles(filesRemotePath) {
    getFtpSync().toListRemoteFiles(filesRemotePath, function(err, files) {
      if (err) {
        // console.error('err:', err);
        vscode.window.showErrorMessage('Ftp-sync: Listing failed: ' + err);
      } else {
        vscode.window.setStatusBarMessage(
          'Ftp-sync: Listing successfully!',
          STATUS_TIMEOUT
        );
        // console.log('files:', files);
        showFiles(files, filesRemotePath);
      }
    });
  }
  listAllFiles(remotePath);
  function showFiles(files, filesRemotePath) {
    const pickOptions = files.map(file => ({
      label: getLabel(file),
      description: file.path,
      file,
      isDir: file.isDir
    }));
    const pickResult = vscode.window.showQuickPick(
      [
        {
          label: '../',
          description: '. UP a folder',
          backPath: getFatherPath(filesRemotePath)
        }
      ].concat(pickOptions),
      {
        placeHolder: 'Select a folder or file'
      }
    );

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
  function showFileActions(file) {
    const pickOptions = [
      {
        label: 'DownLoad',
        description: 'DownLoad this file',
        file,
        operation: 'download'
      },
      {
        label: 'Upload',
        description: 'Upload this file',
        file,
        operation: 'upload'
      }
    ];
    const pickResult = vscode.window.showQuickPick(pickOptions);

    pickResult.then(function(result) {
      // console.log('sel Actions:', result);
      if (!result) {
        return;
      }
      if (result.operation === 'download') {
        downloadFn(getLocalPath(result.file.path), getFtpSync);
      } else if (result.operation === 'upload') {
        UploadFn(getLocalPath(result.file.path), getFtpSync);
      }
    });
  }
};
function getLabel(file) {
  if (file.isDir) {
    return `${file.name}/`;
  } else
    return file.name && file.name.indexOf('/') === 0
      ? file.name.slice(1)
      : file.name;
}
function getLocalPath(fileRemotePath) {
  return {
    fsPath: fileRemotePath.replace(
      ftpconfig.getConfig().remotePath,
      vscode.workspace.rootPath
    )
  };
}
function getFatherPath(son) {
  let father = son.split('/');
  father = father.slice(0, father.length - 1).join('/');
  return father;
}
