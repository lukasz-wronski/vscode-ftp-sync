/* global STATUS_TIMEOUT */
var vscode = require('vscode');
var ftpconfig = require('./ftp-config');
var path = require('path');
var isIgnored = require('./is-ignored');
var output = require('./output');
const downloadFn = require('./downloadcurrent-command');
const UploadFn = require('./uploadcurrent-command');
let mygetFtpSync = null;
module.exports = function(fileUrl, getFtpSync) {
  mygetFtpSync = getFtpSync;
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
  console.log('fileUrl:', fileUrl);
  console.log('config:', config);
  output('fileUrl' + JSON.stringify(fileUrl));
  let remotePath = fileUrl.fsPath
    .replace(vscode.workspace.rootPath, config.remotePath)
    .split('/');
  remotePath = remotePath.slice(0, remotePath.length - 1).join('/');
  console.log('remotePath:', remotePath);
  getFtpSync().toListRemoteFiles(remotePath, function(err, files) {
    if (err) {
      console.error('err:', err);
      vscode.window.showErrorMessage('Ftp-sync: Listing failed: ' + err);
    } else {
      vscode.window.setStatusBarMessage(
        'Ftp-sync: Listing successfully!',
        STATUS_TIMEOUT
      );
      console.log('files:', files);
      showFiles(files, getFtpSync);
    }
  });
};
function showFiles(files) {
  const pickOptions = files.map(file => ({
    label:
      file.name && file.name.indexOf('/') === 0
        ? file.name.slice(1)
        : file.name,
    description: file.path,
    file
  }));

  const pickResult = vscode.window.showQuickPick(pickOptions, {
    placeHolder: 'All files:'
  });

  pickResult.then(function(result) {
    console.log('sel file:', result);
    showActions(result.file);
  });
}
function showActions(file) {
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
    console.log('sel Actions:', result);
    if (result.operation === 'download') {
      downloadFn(result.file, mygetFtpSync);
    } else if (result.operation === 'upload') {
      UploadFn(result.file, mygetFtpSync);
    }
  });
}
