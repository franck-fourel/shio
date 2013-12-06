var log = require('../log.js')('GossipHandler.js');

var except = require('../common/except.js');

exports.makeGossipHandler = function(self) {
  var coordinators = {};
  var agents = {};

  coordinators[self.host] = self;

  return {
    addCoordinator: function(coordinator) {
      log.info("Adding coordinator[%j]", coordinator);

      var host = coordinator['host'];
      if (host == null) {
        throw except.IAE("Must specify a host property, got[%j]", coordinator);
      }

      if (coordinators[host] != null) {
        log.info(
          "Asked to add coordinator that already exists!?  Replacing [%j] with [%j].", coordinators[host], coordinator
          );
      }
      coordinators[host] = coordinator;
    },
    getCoordinators: function() {
      var list = [];
      for (var host in coordinators) {
        list.push(coordinators[host]);
      }
      return list;
    },
    addAgent: function(agent) {
      log.info("Adding agent[%j]", agent);

      var host = agent['host'];
      if (host == null) {
        throw except.IAE("Must specify a host property, got[%j]", agent);
      }

      if (agents[host] != null) {
        log.info(
          "Asked to add agent that already exists!?  Replacing [%j] with [%j].", agents[host], agent
          );
      }
      agents[host] = agent;
    },
    removeAgent: function(host) {
      if (agents[host] != null) {
        log.info("Removing agent[%s]", host);
        delete agents[host];
      }
    },
    getAgent: function(host) {
      return agents[host];
    },
    getAgentHosts: function() {
      return Object.keys(agents);
    }
  };
}