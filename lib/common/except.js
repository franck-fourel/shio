var util = require('util');

function makeExceptionMaker(type)
{
  return function(message) {
    var restOfArgs = Array.prototype.slice.call(arguments, 1);
    var message = util.format.apply(null, [message].concat(restOfArgs));
    return {
      name: type,
      message: message,
      stack: new Error(message).stack
    };
  };
}

exports.IAE = makeExceptionMaker("IllegalArgumentException");
exports.ISE = makeExceptionMaker("IllegalStateException");
exports.RE = makeExceptionMaker("RuntimeException");
