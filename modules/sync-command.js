/* global STATUS_TIMEOUT */
var vscode = require('vscode');
var ftpconfig = require('./ftp-config');
var dirpick = require('./dirpick');
var path = require('path');
var fss = require('./ftp-sync-wrapper');
var ftpSync = fss(require('ftpsync'));


module.exports = function(isUpload) {
	
	if(!ftpconfig.validateConfig())
		return;
	
	var config = ftpconfig.getConfig()
	var syncHelper = require('./sync-helper')(config);
	
	var showSyncSummary = function(sync, options) {
		var syncJson = JSON.stringify(sync, null, 4);
		var prepareSyncDocument = vscode.workspace.openTextDocument(vscode.Uri.parse("untitled:sync-summary.json"));
		prepareSyncDocument.then(function(document) {
			var showSyncDocument = vscode.window.showTextDocument(document);
			showSyncDocument.then(function() {
				vscode.window.activeTextEditor.edit(function(editBuilder) {
					editBuilder.insert(new vscode.Position(0, 0), syncJson);
				});
				vscode.window.activeTextEditor.document.syncOptions = options;
			})
		});
	}
	
	var prepareProgressMessage;
	syncHelper.onPrepareRemoteProgress(function(path) {
		if(prepareProgressMessage) prepareProgressMessage.dispose();
		prepareProgressMessage = vscode.window.setStatusBarMessage("Ftp-sync: collecting remote files list (" + path + ")");
	});
	syncHelper.opPrepareLocalProgress(function(path) {
		if(prepareProgressMessage) prepareProgressMessage.dispose();
		prepareProgressMessage = vscode.window.setStatusBarMessage("Ftp-sync: collecting local files list (" + path + ")");
	});
	
	var prepareSync = function(options) {
		var syncMessage = vscode.window.setStatusBarMessage("Ftp-sync: sync prepare in progress...");
		syncHelper.prepareSync(options, function(err, sync) {
			syncMessage.dispose();
			if(prepareProgressMessage) prepareProgressMessage.dispose();
			if(err) vscode.window.showErrorMessage("Ftp-sync: sync error: " + err);
			else {
				var pickOptions = [{
						label: "Run",
						description: "Run all " + sync.totalOperations() + " operations now",
						operation: "run"
					}, {
						label: "Review",
						description: "Let me review and change operations list",
						operation: "review"
					}, {
						label: "Cancel",
						description: "I've changed my mind, cancel sync"
					}];

				var pickResult = vscode.window.showQuickPick(pickOptions, {
					placeHolder: "There are " + sync.totalOperations() + " operations to perform"
				});
				
				pickResult.then(function(result) {
					if(result && result.operation == "run")
						syncHelper.executeSync(sync, options);
					else if(result && result.operation == "review")
						showSyncSummary(sync, options);
				})
				
			}
		});
	}
	
	var prepareoptions = function(dirPath) {
		
		var pickResult = vscode.window.showQuickPick([{
			label: "Full-sync",
			description: "Removes orphan files on " + (isUpload ? "remote" : "local"),
			mode: "full"
		}, {
			label: "Safe-sync",
			description: "Don't remove orphan files on " + (isUpload ? "remote" : "local"),
			mode: "safe"
		}, {
			label: isUpload ? "Force-upload" : "Force download",
			description: (isUpload ? "Uploads" : "Downloads") + " files, no matter changed or not",
			mode: "force"
		}], { placeHolder: "How do you like to sync your files?" });
		
		pickResult.then(function(result) {
			if(!result) return;
			var syncOptions = {
				remotePath: path.join(config.remotePath, dirPath),
				localPath: path.join(vscode.workspace.rootPath, dirPath),
				upload: isUpload,
				mode: result.mode
			};
			
			prepareSync(syncOptions);
		})
		
	}
	
	var syncDir = function(dirPath) {
		if(dirPath) {
			prepareoptions(dirPath);
		}
	}
	
	dirpick(syncDir);
}