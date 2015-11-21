var vscode = require('vscode');
var ftpconfig = require('./ftp-config');
var fs = require('fs');

module.exports = function() {
	if(!vscode.workspace.rootPath) {
		vscode.window.showErrorMessage("Cannot init ftp-sync without opened folder");
		return;
	}
	
	if(!fs.existsSync(ftpconfig.getConfigDir()))
		fs.mkdirSync(ftpconfig.getConfigDir());

	if(fs.existsSync(ftpconfig.getConfigPath()))
		vscode.window.showWarningMessage("Ftp-sync config already exists");
	else
		fs.writeFileSync(ftpconfig.getConfigPath(), JSON.stringify(ftpconfig.defaultConfig, null, 4));
	
	//TODO: open config file when created
	// var configDocument = vscode.workspace.openTextDocument(configPath);
	// configDocument.then(function() {
	// 	vscode.window.showTextDocument(configDocument);
	// });
}