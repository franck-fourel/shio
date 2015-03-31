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

var util = require('util');

var superagent = require('superagent');

var except = require('amoeba').except;

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
                    return cb(null, res.body);
                  }
                  else {
                    return cb(makeError(err, res), null);
                  }
                });
    },
    addCoordinator: function(coordinator, cb) {
      superagent.post(util.format('http://%s/v1/coordinator', host))
                .type('application/json')
                .send(coordinator)
                .end(function(err, res) {
                  return cb(res != null && res.status === 201 ? null : makeError(err, res));
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
                  return cb(res != null && res.status === 201 ? null : makeError(err, res));
                });
    },
    getHost: function() {
      return host;
    }
  };
};