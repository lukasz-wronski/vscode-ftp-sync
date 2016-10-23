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
	if(isIgnored(config.ignore, fileUrl.fsPath)) {
		vscode.window.showErrorMessage("Ftp-sync: Selected file is ignored.");
		return;
	}

	var fileName = path.basename(fileUrl.fsPath);
	var uploadingStatus = vscode.window.setStatusBarMessage("Ftp-sync: Uploading " + fileName + " to FTP server...");

	getFtpSync().uploadFile(fileUrl.fsPath, vscode.workspace.rootPath, function(err) {
		uploadingStatus.dispose();
		if(err)
			vscode.window.showErrorMessage("Ftp-sync: Uploading " + fileName + " failed: " + err);
		else
			vscode.window.setStatusBarMessage("Ftp-sync: " + fileName + " uploaded successfully!", STATUS_TIMEOUT);
	})
}