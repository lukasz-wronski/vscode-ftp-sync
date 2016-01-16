var vscode = require("vscode");
var _ = require("lodash");

module.exports = function(msg) {
    if(_.startsWith(msg, "[connection] > 'PASS"))
        return;

    var output = vscode.window.createOutputChannel("ftp-sync");
    output.appendLine(msg);
}