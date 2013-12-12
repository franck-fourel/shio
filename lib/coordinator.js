/*
 * == TIDEPOOL LICENSE ==
 * Copyright (C) 2013 Tidepool Project
 * 
 * This source code is subject to the terms of the Tidepool Open Data License, v. 1.0.
 * If a copy of the license was not provided with this file, you can obtain one at:
 *     http://tidepool.org/license/
 * 
 * == TIDEPOOL LICENSE ==
 */

(function() {
  'use strict';

  var restify = require('restify');

  var config = require('./config.js').loadConfig('./config.json');
  var log = require('./log.js')('coordinator.js');

  var AgentBabysitter = require('./coordinator/AgentBabysitter.js');
  var AgentClient = require('./coordinator/AgentClient.js');
  var serverFactory = require('./common/ServerFactory.js');

  function run() {
    var polling = require('./common/polling.js');
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
    require("./coordinator/gossipServer.js")(
      serverFactory, coordinatorGossip, agentGossip, config.gossip
    ).start();

    var sitter = new AgentBabysitter(
      agentGossip, 
      function(config){ 
        return new AgentClient(restify, config); 
      }, 
      config.coordinator
    );

    require("./coordinator/coordinatorServer.js")(
      serverFactory, sitter, config.coordinator
    ).start();
  }

  run();
}).call(this);
