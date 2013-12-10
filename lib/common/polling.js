var log = require('../log.js')('polling.js');
var util = require('util');

function repeat(name, fn, delay) {
  fn(function(err){
    if (err == null) {
      setTimeout(function(){
        repeat(name, fn, delay);
      }, delay).unref();
    }
    else {
      if (err !== 'stop') {
        log.info("%s stopping because of error[%s]", name, util.inspect(err));
      }
    }
  });  
};

exports.repeat = repeat;