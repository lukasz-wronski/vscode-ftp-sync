/* global STATUS_TIMEOUT */
var vscode = require('vscode');
var ftpconfig = require('./ftp-config');
var dirpick = require('./dirpick');
var path = require('path');
var upath = require('upath');
var fss = require('./ftp-sync-wrapper');
var ftpsync = fss(require('ftpsync'));
var mkdirp = require('mkdirp');

module.exports = function() {
	
	if(!ftpconfig.validateConfig())
		return;
		
	var config = ftpconfig.getConfig()
	var ftpHelper = require('./ftp-helper')(config);
	
	var downloadDir = function(dirPath) {
		var remotePath = path.join(config.remotePath, dirPath);
		var localPath = path.join(vscode.workspace.rootPath, dirPath);
		ftpHelper.dirExists(remotePath, function(exists) {
			if(exists) {
				var collectingStatus = vscode.window.setStatusBarMessage("Ftp-sync: collecting remote files list...");
				ftpsync.settings = ftpconfig.getSyncConfig(remotePath, localPath);
				ftpsync.setup(function() {
					ftpsync.utils.walkRemote(upath.toUnix(remotePath), function(err, list) {
						collectingStatus.dispose();
						if(err) {
							vscode.window.setStatusBarMessage("Ftp-sync: error while downloading list of files: " + err, STATUS_TIMEOUT);
							return;
						}
						
						var downloadingStatus = vscode.window.setStatusBarMessage("Ftp-sync: download started...");
						var ftp = ftpHelper.getFtp();
						var totalFiles = list.files.length;
						
						var downloadNextFile = function() {
							if(list.files.length == 0) {
								downloadingStatus.dispose();
								vscode.window.setStatusBarMessage("Ftp-sync: download complete", STATUS_TIMEOUT);
							}
							else
							{
								var file = list.files[0];
								list.files.splice(0, 1);
								var remoteFilePath = upath.toUnix(path.join(remotePath, file.id));
								var localFilePath = path.join(localPath, file.id);
								mkdirp(path.dirname(localFilePath), function(err) { 
									ftp.get(remoteFilePath, localFilePath, function(err) {
										if(err)
											vscode.window.showErrorMessage("Ftp-sync: error while downloading file: " + err);
										downloadingStatus.dispose();
										downloadingStatus = vscode.window.setStatusBarMessage("Ftp-sync: downloaded " + (totalFiles - list.files.length) + " of " + totalFiles + " files...");	
										downloadNextFile();
									});
								});
							}
						}
						
						downloadNextFile();
						
						
					})
				});
			}
			else
				vscode.window.showWarningMessage("Ftp-sync: selected folder does not exist on remote server")
		});
	}
	
	dirpick(downloadDir);
}