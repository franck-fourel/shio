var util = require('util');

var superagent = require('superagent');

var except = require('./except.js');

module.exports = function(config) {
  var host = config.host;
  if (config.port != null) {
    host = util.format('%s:%s', host, config.port);
  }

  function makeError(err, res) {
    if (err == null) {
      return { Error: util.format('[%s]: %s', host, res.clientError ? res.body : res.error.message) };
    }
    return err;
  }

  return {
    getCoordinators: function(cb) {
      superagent.get(util.format('http://%s/v1/coordinator', host))
                .end(function(err, res) {
                  if (res != null && res.status === 200) {
                    cb(null, res.body)
                  }
                  else {
                    cb(makeError(err, res), null);
                  }
                });
    },
    addCoordinator: function(coordinator, cb) {
      superagent.post(util.format('http://%s/v1/coordinator', host))
                .type('application/json')
                .send(coordinator)
                .end(function(err, res) {
                  cb(res != null && res.status === 201 ? null : makeError(err, res));
                });
    },
    agentHeartbeat: function(agent, cb) {
      if (agent.host == null) {
        throw except.IAE('Must specify a host parameter[%j]', agent);
      }

      superagent.post(util.format('http://%s/v1/agent', host))
                .type('application/json')
                .query({ heartbeat: true })
                .send(agent)
                .end(function(err, res) {
                  cb(res != null && res.status === 201 ? null : makeError(err, res));
                });
    },
    getHost: function() {
      return host;
    }
  }
}