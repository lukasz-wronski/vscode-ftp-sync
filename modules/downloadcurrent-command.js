/* global STATUS_TIMEOUT */
var vscode = require("vscode");
var ftpconfig = require("./ftp-config");
var path = require("path");
var isIgnored = require("./is-ignored");

module.exports = function(fileUrl, getFtpSync) {
       if(!vscode.workspace.rootPath) {
               vscode.window.showErrorMessage("Ftp-sync: Cannot init ftp-sync without opened folder");
               return;
       }

       if(fileUrl.fsPath.indexOf(vscode.workspace.rootPath) < 0) {
               vscode.window.showErrorMessage("Ftp-sync: Selected file is not a part of the workspace.");
               return;
       }

       var config = ftpconfig.getConfig();
       if(isIgnored(fileUrl.fsPath, config.allow, config.ignore)) {
               vscode.window.showErrorMessage("Ftp-sync: Selected file is ignored.");
               return;
       }

       var fileName = path.basename(fileUrl.fsPath);
       var downloadStatus = vscode.window.setStatusBarMessage("Ftp-sync: Downloading " + fileName + " from FTP server...", STATUS_TIMEOUT);
       getFtpSync().downloadFile(fileUrl.fsPath, vscode.workspace.rootPath, function(err) {
               downloadStatus.dispose();
               if(err)
                       vscode.window.showErrorMessage("Ftp-sync: Downloading " + fileName + " failed: " + err);
               else
                       vscode.window.setStatusBarMessage("Ftp-sync: " + fileName + " downloaded successfully!", STATUS_TIMEOUT);
       })
}
