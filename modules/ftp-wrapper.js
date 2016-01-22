module.exports = function() {
    var self = this;
    
    var Ftp = require('ftp');
    var ftp = new Ftp();
    var fs = require('fs');
    
    self.connect = function(ftpConfig) {
        ftp.connect(ftpConfig);
    }
    
    self.onready = function(callback) {
        ftp.once('ready', callback);
    }  
    
    self.onerror = function(callback) {
        ftp.once('error', callback);
    }
    
    self.pasv = function(callback) {
        ftp._pasv(callback);
    }
    
    self.end = function() {
        ftp.end();
    }
    
    self.onclose = function(callback) {
        ftp.once('close', callback);
    }
    
    self.list = function(path, callback) {
        ftp.list(path, callback);
    }
    
    self.get = function(remotePath, localPath, callback) {
        ftp.get(remotePath, function(err, stream) {
            if(err)
               callback(err);
            else {
                var writeStream = fs.createWriteStream(localPath);
                stream.pipe(writeStream);
                writeStream.on('finish', function() {
                    callback();
                });
                writeStream.on('error', function(err) {
                    callback(err);
                });
            }
        }); 
    }
    
    self.put = function(local, remote, callback) {
        ftp.put(local, remote, callback)
    }
    
    self.mkdir = function(path, callback) {
        ftp.mkdir(path, callback)
    }
    
    self.delete = function(path, callback) {
        ftp.delete(path, callback)
    }
    
    self.rmdir = function(path, callback) {
        ftp.rmdir(path, callback)
    }
   
}