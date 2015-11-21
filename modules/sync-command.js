var vscode = require('vscode');
var ftpconfig = require('./ftp-config');
var dirpick = require('./dirpick');
var config = ftpconfig.getConfig()
var ftpHelper = require('./ftp-helper')(config);
var path = require('path');
var fss = require('./ftp-sync-silencer');
var ftpsync = fss(require('ftpsync'));


module.exports = function() {
	
	var syncDir = function(dirPath) {
		if(dirPath) {
			var remotePath = path.join(config.remotePath, dirPath);
			var localPath = path.join(vscode.workspace.rootPath, dirPath);
			vscode.window.showInformationMessage("Ftp-sync: Sync local to remote in progress - this might take a while");
			ftpHelper.ensureDirExists(remotePath, function() {
				ftpsync.settings = ftpconfig.getSyncConfig(remotePath, localPath);
				ftpsync.run(function() {
					vscode.window.showInformationMessage("Ftp-sync: Sync local to remote complete");
				});
			});
		}
	}
	
	dirpick(syncDir);
}