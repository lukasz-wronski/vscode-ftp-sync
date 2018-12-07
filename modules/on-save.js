/* global STATUS_TIMEOUT */
var vscode = require("vscode");
var ftpconfig = require("./ftp-config");
var path = require("path");
var isIgnored = require("./is-ignored");
var upath = require("upath");

module.exports = function(document, getFtpSync, skipOnSaveCheck) {
  if (document.uri.fsPath.indexOf(ftpconfig.rootPath().fsPath) < 0) return;

  var config = ftpconfig.getConfig();

  //We don't care about generated file uploads, let's see if it's a candidate for upload anyway.
  if (!config.uploadOnSave && !skipOnSaveCheck) return;

  if (isIgnored(document.uri.fsPath, config.allow, config.ignore)) return;

  var fileName = path.basename(document.uri.fsPath);
  var uploadingStatus = vscode.window.setStatusBarMessage(
    "Ftp-sync: Uploading " + fileName + " to FTP server..."
  );

  getFtpSync().uploadFile(
    document.uri.fsPath,
    ftpconfig.rootPath().fsPath,
    function(err) {
      uploadingStatus.dispose();
      if (err)
        vscode.window.showErrorMessage(
          "Ftp-sync: Uploading " + fileName + " failed: " + err
        );
      else
        vscode.window.setStatusBarMessage(
          "Ftp-sync: " + fileName + " uploaded successfully!",
          STATUS_TIMEOUT
        );
    }
  );
};
