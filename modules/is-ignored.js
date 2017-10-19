var upath = require("upath");

module.exports = function(path, patterns_allowed, patterns_ignored) {
	path = upath.toUnix(path);

	var n = 0, skip = false;
	if (patterns_allowed.length > 0) {
		skip = true;
		for (n = 0; n < patterns_allowed.length; n++){
			if ((new RegExp(patterns_allowed[n])).test(path)) {
				skip = false;
				break;
			}
		}
	}

	for (n = 0; n < patterns_ignored.length; n++){
		if ((new RegExp(patterns_ignored[n])).test(path)) {
			skip = true;
			break;
		}
	}

	return skip;
}
