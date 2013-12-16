var async = require('async');
var util = require('util');

var log = require('../log.js')('agentGossipManager.js');

module.exports = function(agent, gossipClientFactory, polling, config) {
  log.info('Building gossip client for agent[%j]', agent);
  var parentClient = gossipClientFactory(config);

  var coordinators = {};

  function findCoordinators(cb) {
    parentClient.getCoordinators(function(err, coordinatorsFromParent){
      if (err != null) {
        log.warn(err, 'Error getting coordinators from parent[%s]', parentClient.getHost());
        return cb();
      }

      async.parallel(
        coordinatorsFromParent.map(function(coordinator) {
          var client = gossipClientFactory(coordinator);
          return client.getCoordinators.bind(client);
        }),
        function(err, results) {
          if (err == null) {
            for (var i = 0; i < results.length; ++i) {
              for (var j = 0; j < results[i].length; ++j) {
                var coordinator = results[i][j];
                if (coordinators[coordinator.host] == null) {
                  log.info('New coordinator[%j] found!', coordinator);
                  coordinators[coordinator.host] = coordinator;
                  var client = gossipClientFactory(coordinator);
                  polling.repeat(
                    util.format('%s heartbeat', coordinator.host),
                    heartbeatCoordinatorFn(coordinator.host, client),
                    config.heartbeatDuration
                  );
                }
              }
            }
          }
          else {
            log.warn(err, "Error getting coordinators from known coordinators.");
          }
          cb();
        }
      );
    });
  };

  function heartbeatCoordinatorFn(host, client) {
    return function(cb) {
      log.info("Hearbeat to coordinator[%s].", host);
      client.agentHeartbeat(
        agent,
        function(err, results) {
          if (err != null) {
            log.warn(err, "Unable to heartbeat coordinator[%s]. Removing[%s].", client.getHost(), host);
            delete coordinators[host];
          }
          log.info("Heartbeat[%s] complete.", host);
          cb(err);
        }
      );
    }
  };

  return {
    getCurrCoordinators: function() {
      return Object.keys(coordinators);
    },
    start: function() {
      polling.repeat(
        "coordinator finder",
        findCoordinators,
        config.heartbeatDuration
      );
    }
  };
}