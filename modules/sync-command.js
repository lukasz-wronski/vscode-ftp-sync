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
	var syncHelper = require('./sync-helper')(config);
	
	var syncDir = function(dirPath) {
		if(dirPath) {
			syncHelper.prepareSync({
				remotePath: path.join(config.remotePath, dirPath),
				localPath: path.join(vscode.workspace.rootPath, dirPath)
			});
		}
	}
	
	dirpick(syncDir);
}