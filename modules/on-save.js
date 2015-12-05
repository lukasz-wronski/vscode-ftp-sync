/* global STATUS_TIMEOUT */
var vscode = require("vscode");
var ftpconfig = require("./ftp-config");
var path = require("path");
var upath = require("upath");

module.exports = function(document, getFtpSync) {
	
	if(document.uri.fsPath.indexOf(vscode.workspace.rootPath) < 0)
		return;
		
	if(!ftpconfig.getConfig().uploadOnSave)
		return;
		
	var fileName = path.basename(document.uri.fsPath);
	var uploadingStatus = vscode.window.setStatusBarMessage("Ftp-sync: Uploading " + fileName + " to FTP server...");

	getFtpSync().uploadFile(document.uri.fsPath, vscode.workspace.rootPath, function(err) {
		uploadingStatus.dispose();
		if(err)
			vscode.window.showErrorMessage("Ftp-sync: Uploading " + fileName + " failed: " + err);
		else
			vscode.window.setStatusBarMessage("Ftp-sync: " + fileName + " uploaded successfully!", STATUS_TIMEOUT);
	})


}