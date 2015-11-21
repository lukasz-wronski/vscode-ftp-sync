var vscode = require('vscode');
var ftpconfig = require('./ftp-config');
var dirpick = require('./dirpick');
var config = ftpconfig.getConfig()
var ftpHelper = require('./ftp-helper')(config);
var path = require('path');

module.exports = function() {
	
	var syncDir = function(dirPath) {
		if(dirPath) {
			var remotePath = path.join(config.remotePath, dirPath);
			ftpHelper.ensureDirExists(remotePath, function() {
				console.log("ok");
			});
		}
	}
	
	dirpick(syncDir);
}