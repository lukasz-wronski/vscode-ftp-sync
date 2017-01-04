/* global STATUS_TIMEOUT */
var vscode = require("vscode");
var ftpconfig = require("./ftp-config");
var path = require("path");
var isIgnored = require("./is-ignored");
var upath = require("upath");

module.exports = function(document, getFtpSync, skipOnSaveCheck) {
	
	if(document.uri.fsPath.indexOf(vscode.workspace.rootPath) < 0)
		return;
		
	var config = ftpconfig.getConfig();

	//Should we bother to check for generated file uploads?
	if (config.generatedFiles.uploadOnSave) {
		//If it's not an auto uploaded generated file it won't start with that directory
		if (!upath.normalize(path.dirname(document.uri.fsPath)).startsWith( getFtpSync().getConfig().getGeneratedDir()) ) {
			//Don't upload it!
			if(!config.uploadOnSave && !skipOnSaveCheck)
				return;
		}
		//It's an auto upload generated file
		else {
			//Let's see if it's an extension we will be supporting!
				if (!config.generatedFiles.extensionsToInclude.some(function(str) {
				return document.uri.fsPath.endsWith(str); 
			}))
				return;
		}
	}	
	//We don't care about generated file uploads, let's see if it's a candidate for upload anyway.
	else {
		if(!config.uploadOnSave && !skipOnSaveCheck)
			return;
	}

	if(isIgnored(config.ignore, document.uri.fsPath)) return;
	
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