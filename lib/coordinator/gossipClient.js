var util = require('util');

var superagent = require('superagent');

module.exports = function(config) {
  var host = util.format('%s:%s', config.host, config.port);

  return {
    getCoordinators: function(cb) {
      superagent.get(util.format('http://%s/v1/coordinator', host))
                .end(function(err, res) {
                  if (err == null) {
                    if (res.ok) {
                      cb(null, res.body);
                    }
                    else {
                      cb(res.error, null);
                    }
                  }
                  else {
                    cb(err, null);
                  }
                });
    },
    getHost: function() {
      return host;
    }
  }
}