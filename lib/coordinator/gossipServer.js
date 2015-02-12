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

module.exports = function (serverFactory, coordinatorGossip, agentGossip, config)
{
  var server = serverFactory.makeServer('Gossip', config);

  server.withRestifyServer(function(restify){
    restify.get('/v1/coordinator', function(req, res, next) {
      res.send(200, coordinatorGossip.getCoordinators());
      return next();
    });

    restify.post('/v1/coordinator', function(req, res, next) {
      var coordinator = req.body;
      coordinatorGossip.addCoordinator(coordinator);
      res.send(201);
      return next();
    });

    restify.get('/v1/agent', function(req, res, next) {
      res.send(200, agentGossip.getAgentHosts());
      return next();
    });

    restify.post('/v1/agent', function(req, res, next) {
      var agent = req.body;
      var doHeartbeat = req.params.heartbeat != null;

      if (doHeartbeat) {
        agentGossip.agentHeartbeat(agent);
      }
      else {
        agentGossip.addAgent(agent);
      }

      res.send(201);
      return next();
    });

    restify.get('/v1/agent/:agentId', function(req, res, next) {
      var agent = agentGossip.getAgent(req.params.agentId);

      if (agent == null) {
        return res.send(404);
      }
      res.send(200, agent);
      return next();
    });
  });

  return {
    start: server.start
  };
};