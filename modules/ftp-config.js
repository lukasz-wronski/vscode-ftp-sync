var fs = require("fs");
var vscode = require("vscode");
var path = require("path");
var _ = require("lodash");
var upath = require("upath");
var output = require("./output");

module.exports = {
	getConfigPath: function() {
		return this.getConfigDir() + "/ftp-sync.json";
	},
	getConfigDir: function() {
		return vscode.workspace.rootPath + "/.vscode";
	},
	getGeneratedDir: function() {
		return upath.join(vscode.workspace.rootPath, this.generatedFiles.path);
	},
	defaultConfig: {
		remotePath: "./",
		host: "host",
		username: "username",
		password: "password",
		port: 21,
		secure: false,
        protocol: "ftp",
		uploadOnSave: false,
        passive: false,
        debug: false,
        privateKeyPath: null,
        passphrase: null,
		ignore: ["\\.vscode","\\.git","\\.DS_Store"],
		generatedFiles: {
			uploadOnSave: false,
			extensionsToInclude: [],
			path: ''
		}
	},
	getConfig: function() {
		var configjson = fs.readFileSync(this.getConfigPath()).toString();
		var configObject;

		try {
			configObject = JSON.parse(configjson);
		}
		catch (err){
			vscode.window.showErrorMessage("Ftp-sync: Config file is not a valid JSON document. - " + err.message);
		}
		return _.defaults(configObject, this.defaultConfig);
	},
	validateConfig: function() {
		if(!fs.existsSync(this.getConfigPath())) {
			var options = ["Create ftp-sync config now...", "Nah, forget about it..."];
			var pick = vscode.window.showQuickPick(options, { placeHolder: "No configuration file found. Run Init command first." });
			pick.then(function(answer) {
				if(answer == options[0])
					require("./init-command")();
			})
			return false;
		}
		
		return true;
	},
	getSyncConfig: function() {
		var config = this.getConfig();
		return {
			getGeneratedDir: this.getGeneratedDir,
			local: config.localPath,
			remote: upath.toUnix(config.remotePath),
			host: config.host,
			port: config.port,
			user: config.username,
			password: config.password,
			passphrase: config.passphrase,
			ignore: config.ignore,
            passive: config.passive,
            secure: config.secure,
            protocol: config.protocol || "ftp",
            privateKeyPath: config.privateKeyPath,
            passphrase: config.passphrase,
			generatedFiles: config.generatedFiles,
            debug: config.debug ? function(msg) {
                output(msg);
            } : null
		}
	},
	connectionChanged: function(oldConfig) {
		var config = this.getSyncConfig();
		return config.host != oldConfig.host 
			|| config.port != oldConfig.port 
			|| config.user != oldConfig.user 
			|| config.password != oldConfig.password;
	}
}
