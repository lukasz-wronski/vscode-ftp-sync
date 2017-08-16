var vscode = require('vscode');

module.exports = function(callback) {
    return vscode.window.showInputBox({
        prompt: 'Enter your password',
        password: true
    });
};
