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

  var superagent = require('superagent');

  var config = require('./config.js').loadConfig('./config.json');
  var log = require('./log.js')('agent.js');

  var buildSeaportConfig = function()
  {
    var seaportConfig = {};

    for (var field in config.agent) {
      seaportConfig[field] = config.agent[field];
    }
    seaportConfig.payload = ;
    return seaportConfig;
  }

  function run() {
    var AWS = require('aws-sdk');
    AWS.config.update(config.aws);
    var s3 = new AWS.S3();

    require('./agent/AgentServer.js')(s3, config.agent).start();

    var agentDescriptor = {
      hostname: os.hostname(),
      osType: os.type(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      mem: os.totalmem(),
      host: config.agent.host,
      port: config.agent.port
    }

    var poller = require('./agent/coordinatorPoller.js')(
      agentDescriptor, require('./common/gossipClient.js'), polling, config.gossip
    ).start();
  }

  run();
}).call(this);
  