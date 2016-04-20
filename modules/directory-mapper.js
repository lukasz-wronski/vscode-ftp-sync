var vscode = require('vscode');
var ftpconfig = require('./ftp-config');
var path = require("path");
var fs = require("fs");

module.exports = {
    
    getMap: function () {
        return ftpconfig.getConfig().directorymap;
    },
    
    // Replaces remote path if there is a mapping specified for it.
    getRemotePath: function(remotePath) {
        
        if (path.relative(vscode.workspace.rootPath, remotePath) != remotePath) {
            var p_path = path.parse(path.join(vscode.workspace.rootPath, remotePath));
        } else {
            var p_path = path.parse(path.join(vscode.workspace.rootPath, path.relative(vscode.workspace.rootPath, remotePath)));
        }
        
        // Keep in mind that remotePath is based on our relative workspace path
        if (fs.lstatSync(path.format(p_path)).isDirectory()) {
            var newPath = ftpconfig.getConfig().directorymap[remotePath];
            return (newPath !== undefined)? newPath:remotePath;
        } else {
            var newDir = ftpconfig.getConfig().directorymap[path.relative(vscode.workspace.rootPath, p_path.dir)];
            if (newDir !== undefined) {
                return path.join(newDir, p_path.base);
            }
        }
        return remotePath;        
    }
    
}