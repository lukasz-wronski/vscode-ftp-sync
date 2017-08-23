/* global STATUS_TIMEOUT */
var vscode = require('vscode');
var helper = require('./command-helper');


module.exports = function(getSyncHelper) {

	if(!vscode.window.activeTextEditor || 
	   !vscode.window.activeTextEditor.document) {
		vscode.window.showErrorMessage("Ftp-sync: no sync-summary found. Run sync again and don\'t close the sync-summary file.");
		return;
	}
	
    var options = helper.getStore(vscode.window.activeTextEditor.document).syncOptions;
    if (!options) {
		vscode.window.showErrorMessage("Ftp-sync: no operations list to commit. Run sync first.");
		return;
    }

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
	
