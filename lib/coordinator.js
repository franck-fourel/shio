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

(function() {
  'use strict';

  var restify = require('restify');

  var config = require('./config.js').loadConfig('./config.json');

  var AgentBabysitter = require('./coordinator/AgentBabysitter.js');
  var AgentClient = require('./coordinator/AgentClient.js');
  var serverFactory = require('./common/ServerFactory.js');

  function run() {
    var polling = require('amoeba').polling;
    var coordinatorGossip = require('./coordinator/gossipHandlerCoordinators.js')(
      { host: config.self.host + ':' + config.gossip.port },
      config.gossip,
      require('./common/gossipClient.js'),
      polling
    );
    var agentGossip = require('./coordinator/gossipHandlerAgents.js')(
      config.gossip,
      polling
    );
    require('./coordinator/gossipServer.js')(
      serverFactory, coordinatorGossip, agentGossip, config.gossip
    ).start();

    var sitter = new AgentBabysitter(
      agentGossip,
      function(config){
        return new AgentClient(restify, config);
      },
      config.coordinator
    );

    require('./coordinator/coordinatorServer.js')(
      serverFactory, sitter, config.coordinator
    ).start();
  }

  run();
}).call(this);
