var fs = require("fs");
var vscode = require("vscode");
var path = require("path");
var _ = require("lodash");
var upath = require("upath");

module.exports = {
	getConfigPath: function() {
		return this.getConfigDir() + "/ftp-sync.json";
	},
	getConfigDir: function() {
		return vscode.workspace.rootPath + "/.vscode";
	},
	defaultConfig: {
		remotePath: "./",
		host: "host",
		username: "username",
		password: "password",
		port: 21,
		uploadOnSave: false,
		ignore: [".vscode", ".git"]
	},
	getConfig: function() {
		var configjson = fs.readFileSync(this.getConfigPath()).toString();
		return _.defaults(JSON.parse(configjson), this.defaultConfig);
	},
	getSyncConfig: function(remote, local) {
		var config = this.getConfig();
		return {
			local: local,
			remote: upath.toUnix(remote),
			host: config.host,
			port: config.port,
			user: config.username,
			pass: config.password,
			connections: "2",
			ignore: config.ignore.map(function(ignore) {
				return "*" + ignore + "*";
			})
		}
	}
}