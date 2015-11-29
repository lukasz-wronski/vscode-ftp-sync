var vscode = require('vscode');
var ftpconfig = require('./ftp-config');
var dirpick = require('./dirpick');
var path = require('path');
var fss = require('./ftp-sync-wrapper');
var ftpSync = fss(require('ftpsync'));


module.exports = function() {

	if(!vscode.window.activeTextEditor || 
	   !vscode.window.activeTextEditor.document ||
	   !vscode.window.activeTextEditor.document.syncOptions) {
		vscode.window.showErrorMessage("Ftp-sync: no operations list to commit. Run sync first.");
		return;
	}

	var syncOptions = vscode.window.activeTextEditor.document.syncOptions;
	var syncJson = vscode.window.activeTextEditor.document.getText();
	var sync = JSON.parse(syncJson);
	console.log(sync);
}
