/* global STATUS_TIMEOUT */
var vscode = require("vscode");
var ftpconfig = require("./ftp-config");
var path = require("path");
var isIgnored = require("./is-ignored");

module.exports = function (fileUrl, getFtpSync) {
	var filePath = fileUrl ? fileUrl.fsPath : undefined;

	//We aren't getting a file, trying to take the current one
	if (!filePath) {
		filePath = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.fileName : undefined;
	}

	if (!filePath) {
		vscode.window.showErrorMessage("Ftp-sync: No file selected");
		return;
	}

	if (!vscode.workspace.rootPath) {
		vscode.window.showErrorMessage("Ftp-sync: Cannot init ftp-sync without opened folder");
		return;
	}

	if (filePath.indexOf(ftpconfig.getLocalPath()) < 0) {
		vscode.window.showErrorMessage("Ftp-sync: Selected file is not a part of the selected local path.");
		return;
	}

	var config = ftpconfig.getConfig();
	if (isIgnored(filePath, config.allow, config.ignore)) {
		vscode.window.showErrorMessage("Ftp-sync: Selected file is ignored.");
		return;
	}

	var fileName = path.basename(filePath);
	var uploadingStatus = vscode.window.setStatusBarMessage("Ftp-sync: Uploading " + fileName + " to FTP server...", STATUS_TIMEOUT);

	getFtpSync().uploadFile(filePath, ftpconfig.getLocalPath(), function (err) {
		uploadingStatus.dispose();
		if (err)
			vscode.window.showErrorMessage("Ftp-sync: Uploading " + fileName + " failed: " + err);
		else
			vscode.window.setStatusBarMessage("Ftp-sync: " + fileName + " uploaded successfully!", STATUS_TIMEOUT);
	})
}