'use strict';

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
  var util = require('util');
  var os = require('os');

  var _ = require('lodash');
  var superagent = require('superagent');

  var AgentActions = require('./agent/AgentActions.js');
  var config = require('./config.js').loadConfig('./config.json');
  var log = require('./log.js')('agent.js');

  function run() {
    var AWS = require('aws-sdk');
    AWS.config.update(config.aws);
    var s3 = new AWS.S3();

    var agentDescriptor = {
      hostname: os.hostname(),
      osType: os.type(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      mem: os.totalmem(),
      host: config.self.host,
      port: config.agent.port
    };

    var actions = new AgentActions(s3, config.agent, _.extend(_.cloneDeep(agentDescriptor), config.self));

    require('./agent/AgentServer.js')(
      require('./common/ServerFactory.js'), actions, config.agent
    ).start();

    var poller = require('./agent/agentGossipManager.js')(
      agentDescriptor, 
      require('./common/gossipClient.js'), 
      require('amoeba').polling,
      config.gossip
    ).start();
  }

  run();
}).call(this);
  