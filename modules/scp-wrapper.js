module.exports = function () {
	var self = this;

	var Mode = require('stat-mode');
	var Client = require('scp2');
	var path = require("path");
	var client = Client;
	var low = require('scp2').Client;
	var config = {};
	var sftp;
	self.connect = function (ftpConfig) {

		try {
			var privateKey = ftpConfig.privateKeyPath ? require('fs').readFileSync(ftpConfig.privateKeyPath) : undefined;
		} catch (err) {
			process.nextTick(function () {
				onErrorHandler(err);
			});
			return;
		}

		config = {
			host: ftpConfig.host,
			port: ftpConfig.port,
			username: ftpConfig.user,
			password: ftpConfig.password,
			privateKey: privateKey,
			passphrase: ftpConfig.passphrase,
			agent: ftpConfig.agent
		};

		client.defaults(config);
		
		setTimeout(function() {
			client.emit('ready');
		});
	}

	self.onready = function (callback) {
		client.once('ready', callback);
	}

	var onErrorHandler;
	self.onerror = function (callback) {
		onErrorHandler = callback;
		client.once('error', callback);
	}

	self.pasv = function (callback) {
		callback();
	}

	self.goSftp = function (callback) {
		client.sftp(function (err, sftpClient) {
			if (!err && !sftp) {
				sftp = sftpClient;
			}
			callback(err);
		})
	}

	self.end = function () {
		client.end();
	}

	self.onclose = function (callback) {
		client.once('close', callback);
	}

	self.list = function (remote, callback) {
		client.sftp(function (err, sftpClient) {
			sftpClient.readdir(remote, function (err, result) {
				if (!err) result = result.map(f => {
					return {
						name: f.filename,
						type: new Mode(f.attrs).isDirectory() ? "d" : "f", //TODO: determine if it's a file or not
						size: f.attrs.size
					}
				});
				callback(err, result);
			});
		});
	}

	self.get = function (remote, local, callback) {
		client.scp(Object.assign({}, config, { path: remote }), local, callback);
	}

	self.put = function (local, remote, callback) {
		client.scp(local, Object.assign({}, config, { path: remote }), callback)
	}

	self.mkdir = function (remote, callback) {
		client.mkdir(remote, callback);
	}

	self.delete = function (remote, callback) {
		client.sftp(function (err, sftpClient) {
			sftpClient.unlink(remote, callback)
		});
	}

	self.rmdir = function (remote, callback) {
		client.sftp(function (err, sftpClient) {
			sftpClient.rmdir(remote, callback)
		});
	}

}