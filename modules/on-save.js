var vscode = require("vscode");
var ftpconfig = require("./ftp-config");
var path = require("path");
var upath = require("upath");
var Ftp = require('jsftp');

module.exports = function(document) {
	var filePath = document.uri.fsPath;
	if(filePath.indexOf(vscode.workspace.rootPath) < 0)
		return;
	
	var config = ftpconfig.getConfig();	
	
	if(!config.uploadOnSave)
		return;
		
	if(config.ignore.filter(function(ignoreItem) {
		return filePath.indexOf(ignoreItem) > 0;
	}).length > 0)
		return;
	
	var ftp = new Ftp({
		host: config.host,
		port: config.port,
		user: config.username,
		pass: config.password,
	});
	
	var pathPostfix = path.relative(vscode.workspace.rootPath, path.dirname(filePath));
	var fileName = path.basename(filePath);
	var targetDir = path.join(config.remotePath, pathPostfix);
	var targetFilepath = path.join(targetDir, fileName);
	
	var ensureDirExists = function(dirPath, callback) {
		ftp.ls(upath.toUnix(dirPath), function(err, res) {
			if(err) {
				var parentDir = path.normalize(path.join(dirPath, ".."));
				ensureDirExists(parentDir, function() {
					ftp.raw.mkd(upath.toUnix(dirPath), function(err, data) {
						if(!err) callback();
					});
				});
			}
			else
				callback();
		})
	}
	
	ensureDirExists(targetDir, function() {
		ftp.put(filePath, upath.toUnix(targetFilepath), function(err) {
			if(err)
				vscode.window.showErrorMessage("Ftp-sync error: " + err)
			else if(config.alertOnSync)
				vscode.window.showInformationMessage("Ftp-sync: file " + fileName + " uploaded");
		});
	});
	
	

}