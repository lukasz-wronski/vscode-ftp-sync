/* global STATUS_TIMEOUT */
var onSave = require('./on-save');

module.exports = function(editor, getFtpSync) {
	onSave(editor.document, getFtpSync, true);
}