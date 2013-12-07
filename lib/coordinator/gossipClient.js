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
    addCoordinator: function(coordinator, cb) {
      superagent.post(util.format('http://%s/v1/coordinator', host))
                .set('Content-Type', 'application/json')
                .send(coordinator)
                .end(function(err, res) {
                  if (err == null) {
                    cb(res.status === 201 ? null : res.error);
                  }
                  else {
                    cb(err);
                  }
                });
    }
    getHost: function() {
      return host;
    }
  }
}