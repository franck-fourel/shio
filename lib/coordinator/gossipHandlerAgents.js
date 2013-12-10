var util = require('util');

var log = require('../log.js')('gossipHandlerAgents.js');

var except = require('../common/except.js');

var getKey = function(elem) {
  var host = elem['host'];
  if (host == null) {
    throw except.IAE("Must specify a host property, got[%j]", elem);
  }

  return host;
}

module.exports = function(config, polling, timeProvider) {
  if (timeProvider == null) {
    timeProvider = {
      getTime: function() { 
        return new Date().getTime();
      }
    }
  }
  var agents = {};

  var _heartbeat = function(key) {
    if (agents[key] == null) {
      throw except.IAE("Cannot register a heartbeat on an unknown key[%s]", key);
    }

    agents[key].heartbeat = timeProvider.getTime() + (config.heartbeatDuration * 3);
  }

  var retVal = {
    addAgent: function(agent) {
      log.info("Adding agent[%j]", agent);

      var key = getKey(agent);
      if (agents[key] != null) {
        log.info(
          "Asked to add agent that already exists!?  Replacing [%j] with [%j].", agents[key], agent
        );
      }
      agents[key] = { payload: agent };
      _heartbeat(key);
    },
    agentHeartbeat: function(agent) {
      log.info("Heartbeat for agent[%j]", agent);

      var key = getKey(agent);
      if (agents[key] == null) {
        addAgent(agent);
      }
      else {
        _heartbeat(key);
      }
    },
    getAgent: function(host) {
      return agents[host] == null ? null : agents[host].payload;
    },
    getAgentHosts: function() {
      return Object.keys(agents);
    }
  };

  polling.repeat(
    "agent heartbeat",
    function(cb) {
      var currTime = timeProvider.getTime();
      for (var agent in agents) {
        var currBeat = agents[agent].heartbeat
        if (currBeat == null) {
          log.warn("Agent[%s] with null heartbeat!?  Dropping.", agent);
          delete agents[agent];
        }
        else if (currBeat < currTime) {
          log.warn("Agent[%s] hasn't checked in passed its heartbeat.  Dropping", agent);
          delete agents[agent];
        }
      }
      cb();
    },
    config.heartbeatDuration
  );

  return retVal;
}