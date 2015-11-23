/* global STATUS_TIMEOUT */
var vscode = require('vscode');
var ftpconfig = require('./ftp-config');
var dirpick = require('./dirpick');
var path = require('path');
var fss = require('./ftp-sync-wrapper');
var ftpSync = fss(require('ftpsync'));


module.exports = function() {
	
	if(!ftpconfig.validateConfig())
		return;
	
	var config = ftpconfig.getConfig()
	var ftpHelper = require('./ftp-helper')(config);
	
	var syncDir = function(dirPath) {
		if(dirPath) {
			var remotePath = path.join(config.remotePath, dirPath);
			var localPath = path.join(vscode.workspace.rootPath, dirPath);
			ftpHelper.ensureDirExists(remotePath, function() {
				ftpSync.reportProgress = true;
				ftpSync.settings = ftpconfig.getSyncConfig(remotePath, localPath);
				ftpSync.run(function(err) {	
					if(err) {
						vscode.window.showErrorMessage("Ftp-sync: Sync local to remote error: " + err);
						if(ftpSync.progressStatus)
							ftpSync.progressStatus.dispose();
					}
				});
			});
		}
	}
	
	dirpick(syncDir);
}