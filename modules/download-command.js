var vscode = require('vscode');
var ftpconfig = require('./ftp-config');
var dirpick = require('./dirpick');
var config = ftpconfig.getConfig()
var ftpHelper = require('./ftp-helper')(config);
var path = require('path');
var upath = require('upath');
var fss = require('./ftp-sync-silencer');
var ftpsync = fss(require('ftpsync'));
var mkdirp = require('mkdirp');

module.exports = function() {
	
	var downloadDir = function(dirPath) {
		var remotePath = path.join(config.remotePath, dirPath);
		var localPath = path.join(vscode.workspace.rootPath, dirPath);
		ftpHelper.dirExists(remotePath, function(exists) {
			if(exists) {
				ftpsync.settings = ftpconfig.getSyncConfig(remotePath, localPath);
				ftpsync.setup(function() {
					ftpsync.utils.walkRemote(upath.toUnix(remotePath), function(err, list) {
						if(err)
							vscode.window.showErrorMessage("Ftp-sync: error while downloading list of files: " + err);
						var processedFiles = 0;
						list.files.forEach(function(file) {
							var remoteFilePath = upath.toUnix(path.join(remotePath, file.id));
							var localFilePath = path.join(localPath, file.id);
							mkdirp(path.dirname(localFilePath), function(err) { 
								ftpHelper.getFtp().get(remoteFilePath, localFilePath, function(err) {
									if(err)
										vscode.window.showErrorMessage("Ftp-sync: error while downloading file: " + err);
									processedFiles++;
									if(processedFiles == list.files.length) 
										vscode.window.showInformationMessage("Ftp-sync: download complete");	
								});
							});
							
						});
					})
				});
			}
			else
				vscode.window.showWarningMessage("Ftp-sync: selected folder does not exist on remote server")
		});
	}
	
	dirpick(downloadDir);
}