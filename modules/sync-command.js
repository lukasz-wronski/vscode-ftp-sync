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
	
	var showSyncSummary = function(sync) {
		var syncJson = JSON.stringify(sync, null, 4);
		syncJson = "// Review list of sync operations, then use Ftp-sync: Commit command to accept changes\r\n" + syncJson;
		var prepareSyncDocument = vscode.workspace.openTextDocument(vscode.Uri.parse("untitled:sync-summary.json"));
		prepareSyncDocument.then(function(document) {
			var showSyncDocument = vscode.window.showTextDocument(document);
			showSyncDocument.then(function() {
				vscode.window.activeTextEditor.edit(function(editBuilder) {
					editBuilder.insert(new vscode.Position(0, 0), syncJson);
				});
				vscode.window.activeTextEditor.document.syncSettings = syncSettings;
			})
		});
	}
	
	var syncDir = function(dirPath) {
		if(dirPath) {
			var syncSettings = {
				remotePath: path.join(config.remotePath, dirPath),
				localPath: path.join(vscode.workspace.rootPath, dirPath)
			};
			syncHelper.prepareSync(syncSettings, function(err, sync) {
				if(err) vscode.window.showErrorMessage("Ftp-sync: sync error: " + err);
				else showSyncSummary(sync);
			});
		}
	}
	
	dirpick(syncDir);
}