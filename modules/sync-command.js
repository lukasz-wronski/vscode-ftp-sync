/* global STATUS_TIMEOUT */
var vscode = require('vscode');
var ftpconfig = require('./ftp-config');
var dirpick = require('./dirpick');
var path = require('path');
var helper = require('./command-helper');

module.exports = function(isUpload, getSyncHelper) {
	
	if(!ftpconfig.validateConfig())
		return;
	
	var showSyncSummary = function(sync, options) {
		var syncJson = JSON.stringify(sync, null, 4);
        var filePath = path.normalize(vscode.workspace.rootPath + "/.vscode/sync-summary-" + Math.floor(Date.now() / 1000) + ".json");
		var uri = vscode.Uri.parse("untitled:" + filePath);
        var prepareSyncDocument = vscode.workspace.openTextDocument(uri);
		prepareSyncDocument.then(function(document) {
			var showSyncDocument = vscode.window.showTextDocument(document);
			showSyncDocument.then(function() {
				var edit = vscode.window.activeTextEditor.edit(function(editBuilder) {
					editBuilder.delete(new vscode.Range(
						new vscode.Position(0,0),
						new vscode.Position(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
					));
				});
				edit.then(function () {
					vscode.window.activeTextEditor.edit(function (editBuilder) {
						editBuilder.insert(new vscode.Position(0, 0), syncJson);
					});
				});
				vscode.window.activeTextEditor.document.syncOptions = options;
			}, function(err) {
            vscode.window.showErrorMessage("Ftp-sync: sync error: " + err)
            })
		}, function(err) {
            vscode.window.showErrorMessage("Ftp-sync: sync error: " + err)
        });
	}
	
	var prepareProgressMessage;
	getSyncHelper().onPrepareRemoteProgress(function(path) {
		if(prepareProgressMessage) prepareProgressMessage.dispose();
		prepareProgressMessage = vscode.window.setStatusBarMessage("Ftp-sync: collecting remote files list (" + path + ")");
	});
	getSyncHelper().onPrepareLocalProgress(function(path) {
		if(prepareProgressMessage) prepareProgressMessage.dispose();
		prepareProgressMessage = vscode.window.setStatusBarMessage("Ftp-sync: collecting local files list (" + path + ")");
	});
	
	var prepareSync = function(options) {
		var syncMessage = vscode.window.setStatusBarMessage("Ftp-sync: sync prepare in progress...");
		getSyncHelper().prepareSync(options, function(err, sync) {
			syncMessage.dispose();
			if(prepareProgressMessage) prepareProgressMessage.dispose();
			if(err) vscode.window.showErrorMessage("Ftp-sync: sync error: " + err);
			else {
				var pickOptions = [{
						label: "Run",
						description: "Run all " + getSyncHelper().totalOperations(sync) + " operations now",
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
					placeHolder: "There are " + getSyncHelper().totalOperations(sync) + " operations to perform"
				});
				
				pickResult.then(function(result) {
					if(result && result.operation == "run")
						helper.executeSync(getSyncHelper(), sync, options)
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
				remotePath: path.join(getSyncHelper().getConfig().remote, dirPath),
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