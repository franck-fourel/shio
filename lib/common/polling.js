exports.repeat = function(name, fn, delay) {
  setTimeout(function(){
    fn(function(err){
      if (err == null) {
        repeat(name, fn, delay);
      }
      else {
        log.info("%s stopping because of error[%s]", name, util.inspect(err));
      }
    });
  }, delay).unref();
};

