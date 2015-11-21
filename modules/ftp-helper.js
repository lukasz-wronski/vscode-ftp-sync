var path = require("path");
var upath = require("upath");
var Ftp = require('jsftp');

var helper = {
	getFtp: function() {
		return new Ftp({
			host: this.config.host,
			port: this.config.port,
			user: this.config.username,
			pass:
			 this.config.password,
		});
	},
	ensureDirExists: function(dirPath, callback) {
		var self = this;
		self.getFtp().ls(upath.toUnix(dirPath), function(err, res) {
			if(err) {
				var parentDir = path.normalize(path.join(dirPath, ".."));
				self.ensureDirExists(parentDir, function() {
					self.getFtp().raw.mkd(upath.toUnix(dirPath), function(err, data) {
						if(!err) 
							callback();
						else 
							vscode.window.showErrorMessage("Ftp-sync error: " + err)
					});
				});
			}
			else
				callback();
		})
	}
}

module.exports = function(ftpconfig) {
	helper.config = ftpconfig;
	return helper;
}