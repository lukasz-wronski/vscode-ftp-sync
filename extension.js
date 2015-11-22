// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
	
	var initCommand = vscode.commands.registerCommand('extension.ftpsyncinit', require('./modules/init-command'));
	var syncCommand = vscode.commands.registerCommand('extension.ftpsyncsync', require('./modules/sync-command'));
	var downloadCommand = vscode.commands.registerCommand('extension.ftpsyncdownload', require('./modules/download-command'));
	
	vscode.workspace.onDidSaveTextDocument(require('./modules/on-save'));
	
	context.subscriptions.push(initCommand);
	context.subscriptions.push(syncCommand);
	context.subscriptions.push(downloadCommand);
}

exports.activate = activate;