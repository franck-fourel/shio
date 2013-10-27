exports.asyncify = function(fn) {
  return function() { 
  	var cb = arguments[arguments.length - 1];
  	fn.apply(null, Array.prototype.splice.call(arguments, 0, arguments.length - 1));
  	if (! (typeof cb === 'undefined')) {
  		cb();
  	}
  }
};

exports.compose = function(lhs, rhs) {
	return function(obj) {
		return lhs(rhs(obj));
	}
};

exports.accessor = function(key) {
	return function(obj) {
		return obj[key];
	}
};

exports.equals = function(val) {
	return function(obj) {
		return val === obj;
	}
};
