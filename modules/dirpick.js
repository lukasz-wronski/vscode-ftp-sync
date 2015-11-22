var vscode = require('vscode');
var fs = require('fs');
var path = require('path');

var getDirectories = function(srcpath) {
  return fs.readdirSync(srcpath).filter(function(file) {
    return fs.statSync(path.join(srcpath, file)).isDirectory();
  });
}

var dirpick = function(callback, currentDir) {
	currentDir = currentDir ? currentDir : ".";
	var selectListPrefix = currentDir != "." ? ".." : "";
	var options = [{ label: path.join(selectListPrefix, path.basename(currentDir)), description: "Choose this folder"}];
	
	getDirectories(path.join(vscode.workspace.rootPath, currentDir)).forEach(function(dir) {
		options.push(path.join(selectListPrefix, path.basename(currentDir), dir));
	})
	
	if(currentDir != ".")
		options.push("..");
		
	var quickPick = vscode.window.showQuickPick(options);
	quickPick.then(function(selected) {
		
		if(!selected) {
			callback(null);
			return;
		}
		
		if(selected.label)
			selected = selected.label;
		
		var selectedDir = path.join(currentDir, path.basename(selected));
		if(selected == options[0].label)
			callback(currentDir);
		else
			dirpick(callback, selectedDir);
	});
}

module.exports = dirpick;