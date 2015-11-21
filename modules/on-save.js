var vscode = require("vscode");
var ftpconfig = require("./ftp-config");
var path = require("path");
var upath = require("upath");

module.exports = function(document) {
	var filePath = document.uri.fsPath;
	if(filePath.indexOf(vscode.workspace.rootPath) < 0)
		return;
	
	var config = ftpconfig.getConfig();	
	var ftpHelper = require("./ftp-helper")(config);
	
	if(!config.uploadOnSave)
		return;
		
	if(config.ignore.filter(function(ignoreItem) {
		return filePath.indexOf(ignoreItem) > 0;
	}).length > 0)
		return;
	
	var pathPostfix = path.relative(vscode.workspace.rootPath, path.dirname(filePath));
	var fileName = path.basename(filePath);
	var targetDir = path.join(config.remotePath, pathPostfix);
	var targetFilepath = path.join(targetDir, fileName);
	
	
	ftpHelper.ensureDirExists(targetDir, function() {
		ftpHelper.getFtp().put(filePath, upath.toUnix(targetFilepath), function(err) {
			if(err)
				vscode.window.showErrorMessage("Ftp-sync error: " + err)
			else if(config.alertOnSync)
				vscode.window.showInformationMessage("Ftp-sync: file " + fileName + " uploaded");
		});
	});
	
	

}