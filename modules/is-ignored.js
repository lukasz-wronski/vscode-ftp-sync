var upath = require("upath");

module.exports = function(patterns, path) {
    path = upath.toUnix(path);
    patterns = patterns.map(function(p) {
        return upath.toUnix(p);
    });
    
    var skip = false;
    patterns.forEach(function(pattern) {
		if(path.match(new RegExp(pattern)))
			skip = true;
	});
    
    return skip;
}