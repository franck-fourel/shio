/*
 * == BSD2 LICENSE ==
 * Copyright (c) 2014, Tidepool Project
 *
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the associated License, which is identical to the BSD 2-Clause
 * License as published by the Open Source Initiative at opensource.org.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the License for more details.
 *
 * You should have received a copy of the License along with this program; if
 * not, you can obtain one from Tidepool Project at tidepool.org.
 * == BSD2 LICENSE ==
 */
'use strict';

var log = require('../log.js')('gossipHandlerAgents.js');

var except = require('amoeba').except;

var getKey = function(elem) {
  var host = elem.host;
  if (host == null) {
    throw except.IAE('Must specify a host property, got[%j]', elem);
  }

  return host;
};

module.exports = function(config, polling, timeProvider) {
  if (timeProvider == null) {
    timeProvider = {
      getTime: function() {
        return new Date().getTime();
      }
    };
  }
  var agents = {};

  function _heartbeat(key) {
    if (agents[key] == null) {
      throw except.IAE('Cannot register a heartbeat on an unknown key[%s]', key);
    }

    agents[key].heartbeat = timeProvider.getTime() + (config.heartbeatDuration * 3);
  }

  var retVal = {
    addAgent: function(agent) {
      log.info('Adding agent[%j]', agent);

      var key = getKey(agent);
      if (agents[key] != null) {
        log.info(
          'Asked to add agent that already exists!?  Replacing [%j] with [%j].', agents[key], agent
        );
      }
      agents[key] = { payload: agent };
      _heartbeat(key);
    },
    agentHeartbeat: function(agent) {
      log.info('Heartbeat for agent[%j]', agent);

      var key = getKey(agent);
      if (agents[key] == null) {
        this.addAgent(agent);
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
    'agent heartbeat',
    function(cb) {
      var currTime = timeProvider.getTime();
      Object.keys(agents).forEach(function(agent){
        var currBeat = agents[agent].heartbeat;
        if (currBeat == null) {
          log.warn('Agent[%s] with null heartbeat!?  Dropping.', agent);
          delete agents[agent];
        }
        else if (currBeat < currTime) {
          log.warn('Agent[%s] hasn\'t checked in passed its heartbeat.  Dropping', agent);
          delete agents[agent];
        }
      });
      return cb();
    },
    config.heartbeatDuration
  );

  return retVal;
};