var vscode = require("vscode");
var _ = require("lodash");

var outputChannel;

module.exports = function(msg) {
    if(_.startsWith(msg, "[connection] > 'PASS"))
        return;

    if (outputChannel === undefined) {
        outputChannel = vscode.window.createOutputChannel("ftp-sync");
        outputChannel.show();
    }
    outputChannel.appendLine(msg);
}