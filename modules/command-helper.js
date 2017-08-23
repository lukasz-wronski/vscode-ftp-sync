var vscode = require('vscode');

var _store = new WeakMap();

module.exports = {
	executeSync: function(syncHelper, sync, options) {
		var syncInfoMessage = null;
		
		syncHelper.onSyncProgress(function(done, of) {
			if(syncInfoMessage) syncInfoMessage.dispose();
			syncInfoMessage = vscode.window.setStatusBarMessage("Ftp-sync: sync progress: " + done + " of " + of + " operations done")
		});
		
		syncHelper.executeSync(sync, options, function(err) {
			if(syncInfoMessage) syncInfoMessage.dispose();
			if(err)
				vscode.window.showErrorMessage("Ftp-sync: sync error: " + err);
			else
				vscode.window.setStatusBarMessage("Ftp-sync: sync-complete!", STATUS_TIMEOUT);
		})
	},
	getStore: function(key) {
		if (!_store.has(key))
			_store.set(key, {});
		return _store.get(key);
	}
}
