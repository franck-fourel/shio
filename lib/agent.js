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


// We currently use the coffeescript-inspired anonymous namespacing model, where we create a function
// and then call it with this. It keeps the namespace from being accidentally overridden
// although it doesn't give us actual namespaces.  
(function() {
  // We use strict because we're only worried about modern browsers and we should be strict.
  // JSHint actually insists on this and it's a good idea.
  'use strict';

  var util = require('util');
  var fs = require('fs');
  var os = require('os');

  var config = require('./config.js').loadConfig('./config.json');

  var AWS = require('aws-sdk');
  AWS.config.update(config.aws);
  var s3 = new AWS.S3();

  var ActionHandler = require('./ActionHandler.js');
  var AgentActions = require('./agent/AgentActions.js');

  var buildSeaportConfig = function()
  {
    var seaportConfig = {};
    for (var field in config.agent) {
      seaportConfig[field] = config.agent[field];
    }
    seaportConfig.payload = {
      hostname: os.hostname(),
      osType: os.type(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      mem: os.totalmem()
    }
    return seaportConfig;
  }

  var run = function() {
    var seaport = require('seaport');
    var seaportHost = config.seaport.host + ":" + config.seaport.port;
    console.info("Connecting to seaport server[%s]", seaportHost);
    var ports = seaport.connect(seaportHost);

    // Restify helps us with building a RESTful API.
    var restify = require('restify');
    var server = restify.createServer({
      name: 'Shio-Agent'
    });

    // Two standard restify handler plugins:
    server.use(restify.queryParser());
    server.use(restify.bodyParser({ mapParams: false }));

    server.get('/status', function(req, res, next) {
      res.send(200, 'OK');
      return next();
    });

    var actions = new AgentActions(s3, config.s3Storage);
    new ActionHandler(actions).register("/slots/:slot", server);
    server.get('/slots', function(req, res, next){
      res.json(actions.getSlots());
      return next();
    });
    

    var port = ports.register("shio-agent@0.0.1", buildSeaportConfig());
    console.log('Shio-Agent serving on port', port);
    server.listen(port);
    server.on('uncaughtException', function(req, res, route, error){
      console.warn("Uncaught Exception on req[%s] for route[%s %s]", req.id(), route.spec.path, route.spec.method);
      console.warn(error.stack);
      res.send(500, util.format("Server Error: %s", req.id()));
    });
  }

  run();
// Wrap up the javascript namespacing model.
}).call(this);
  