/* global STATUS_TIMEOUT */
var vscode = require('vscode');
var helper = require('./command-helper');


module.exports = function(getSyncHelper) {

	if(!vscode.window.activeTextEditor || 
	   !vscode.window.activeTextEditor.document ||
	   !vscode.window.activeTextEditor.document.syncOptions) {
		vscode.window.showErrorMessage("Ftp-sync: no operations list to commit. Run sync first.");
		return;
	}
	
	var options = vscode.window.activeTextEditor.document.syncOptions;
	var syncJson = vscode.window.activeTextEditor.document.getText();
    
    var jsonCorrect = true;
    try
    {
	   var sync = JSON.parse(syncJson);
    }
    catch(err) 
    {
        vscode.window.showErrorMessage("Ftp-sync: review file is not a correct JSON (" + err.message + ")");
        jsonCorrect = false;
    }

    if(jsonCorrect) {
        vscode.commands.executeCommand("workbench.action.closeActiveEditor");
        helper.executeSync(getSyncHelper(), sync, options);
    }
}
	
