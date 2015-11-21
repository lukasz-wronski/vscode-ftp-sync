//Somehow console log in ftp sync causes EPERM: operation not permitted, write Error
// This is a simple workaround

module.exports = function(ftpSync) {
	ftpSync.log = {
		'verbose': function() {},
		'write': function() {},
		'info': function() {},
		'error': function() {},
		'warn': function() {},
  	}
	
	return ftpSync;
}