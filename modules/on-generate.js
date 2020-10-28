/* global STATUS_TIMEOUT */
var vscode = require("vscode");
var ftpconfig = require("./ftp-config");
var path = require("path");
var isIgnored = require("./is-ignored");
var upath = require("upath");

module.exports = function(document, getFtpSync, skipOnSaveCheck) {
  if (document.uri.fsPath.indexOf(ftpconfig.rootPath().fsPath) < 0) return;

  var config = ftpconfig.getConfig();
  
  // Based on issue https://github.com/lukasz-wronski/vscode-ftp-sync/issues/307
  if (!config.uploadOnSave && !skipOnSaveCheck) {
    return;
  };
  
  //Should we bother to check for generated file uploads? (also check if the generated files path is set otherwise skip)
  if (config.generatedFiles.extensionsToInclude.length > 0) {
    //If it's not an auto uploaded generated file it won't start with that directory
    if (
      !upath.normalize(path.dirname(document.uri.fsPath)).startsWith(
        getFtpSync()
          .getConfig()
          .getGeneratedDir()
      )
    )
      return;
    //It's an auto upload generated file
    else {
      //Let's see if it's an extension we will be supporting!
      var extensionCheck = config.generatedFiles.extensionsToInclude.some(
        function(str) {
          return document.uri.fsPath.endsWith(str);
        }
      );

      if (!extensionCheck) return;
    }
  }

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
