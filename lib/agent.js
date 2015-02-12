/*
 * == TIDEPOOL LICENSE ==
 * Copyright (C) 2013, 2014 Tidepool Project
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
 * not, you can obtain one at http://tidepool.org/licenses/
 * == TIDEPOOL LICENSE ==
 */

(function() {
  'use strict';
  var os = require('os');

  var _ = require('lodash');

  var AgentActions = require('./agent/AgentActions.js');
  var config = require('./config.js').loadConfig('./config.json');

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
    );
    poller.start();
  }

  run();
}).call(this);
