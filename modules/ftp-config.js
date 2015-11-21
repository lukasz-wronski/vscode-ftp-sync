var fs = require("fs");
var vscode = require("vscode");
var path = require("path");
var _ = require("lodash");

module.exports = {
	getConfigPath: function() {
		return this.getConfigDir() + "/ftp-sync.json";
	},
	getConfigDir: function() {
		return vscode.workspace.rootPath + "/.vscode";
	},
	defaultConfig: {
		remotePath: "./",
		host: "ftp host",
		username: "username",
		password: "password",
		port: 21,
		uploadOnSave: false,
		alertOnSync: false,
		ignore: [".vscode", ".git"]
	},
	getConfig: function() {
		var configjson = fs.readFileSync(this.getConfigPath()).toString();
		return _.defaults(JSON.parse(configjson), this.defaultConfig);
	},
	getSyncConfig: function(filePath) {
		var config = this.getConfig();
		var filePathDir = path.dirname(filePath);
		var additionalIgnores = fs.readdirSync(filePathDir);
		_.pull(additionalIgnores, path.basename(filePath));
		var remoteFolderPostfix = path.relative(vscode.workspace.rootPath, filePathDir)
		return {
			local: filePathDir,
			remote: path.join(config.remotePath, remoteFolderPostfix),
			host: config.host,
			port: config.port,
			user: config.username,
			pass: config.password,
			connections: "2",
			ignore: _.union(config.ignore, additionalIgnores)
		}
	}
}