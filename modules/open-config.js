var vscode = require('vscode');
var ftpconfig = require('./ftp-config');

module.exports = function () {
    if(!ftpconfig.validateConfig())
		return;
    
    vscode.workspace.openTextDocument(ftpconfig.getConfigPath()).then(document => {
			vscode.window.showTextDocument(document);
    });
}