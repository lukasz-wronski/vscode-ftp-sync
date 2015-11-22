/* global STATUS_TIMEOUT */
//Somehow console log in ftp sync causes EPERM: operation not permitted, write Error. This is a simple workaround
// Also I figured that I can build basic progress indication base on the internal log messages from ftp sync.

var vscode = require("vscode");

module.exports = function(ftpSync) {
	
	ftpSync.progressStatus = null;
	ftpSync.reportProgress = false;
	
	var steps = [
		{ message: "Setup", step: "setup" }, 
		{ message: "Collecting", step: "checking remote files" },
		{ message: "Consolidating", step: "preparing sync plan" },
		{ message: "Commiting", step: "creating remote directories" },
		{ message: "MKDIRs complete.", step: "updating remote files" },
		{ message: "Updates complete.", step: "removing remote files" },
		{ message: "Removals complete", step: "removing remote directories" },
		{ message: "RMDIRs complete.", step: "finishing process" },
		{ message: "Commit complete.", step: "process completed" }
	];
	
	var checkStatus = function(msg) {
		var matchingSteps = steps.filter(function(s) { return s.message == msg });
		if(matchingSteps.length == 0 || !ftpSync.reportProgress)
			return;
		
		var stepIndex = steps.indexOf(matchingSteps[0]);
		
		if(ftpSync.progressStatus)
			ftpSync.progressStatus.dispose();
			
		if(stepIndex == steps.length - 1)
			vscode.window.setStatusBarMessage("Ftp-sync: sync local to remote complete", STATUS_TIMEOUT);
		else
			ftpSync.progressStatus = vscode.window.setStatusBarMessage("Ftp-sync: sync local to remote step " + (stepIndex + 1) + " of " + steps.length + " (" + matchingSteps[0].step + ")...");
	}
	
	ftpSync.log = {
		'verbose': checkStatus,
		'write': checkStatus,
		'info': checkStatus,
		'error': checkStatus,
		'warn': checkStatus,
	}
	
	return ftpSync;
}