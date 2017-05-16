var upath = require("upath");

module.exports = function(patterns, path) {
    path = upath.toUnix(path);
    
    var skip = false;
    patterns.forEach(function(pattern) {
		if(path.match(new RegExp(pattern)))
			skip = true;
	});
    
    return skip;
}