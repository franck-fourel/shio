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

  var fs = require('fs');
  var http = require('http');

  var restify = require('restify');
  var seaport = require('seaport');

  var config = require('./config.js').loadConfig('./config.json');
  var log = require('./log.js')('coordinator.js');

  var ActionHandler = require('./ActionHandler.js');
  var AgentBabysitter = require('./coordinator/AgentBabysitter.js');
  var AgentClient = require('./coordinator/AgentClient.js');
  var SlotActions = require('./coordinator/SlotActions.js');
  var ServerActions = require('./coordinator/ServerActions.js');

  var ifExists = function(path){
    return fs.exists(path) ? path : null;
  };

  function prettyJson(req, res, body) {
    if (!body) {
      if (res.getHeader('Content-Length') === undefined &&
          res.contentLength === undefined) {
        res.setHeader('Content-Length', 0);
      }
      return null;
    }

    if (body instanceof Error) {
      // snoop for RestError or HttpError, but don't rely on instanceof
      if ((body.restCode || body.httpCode) && body.body) {
        body = body.body;
      } else {
        body = {
          message: body.message
        };
      }
    }

    if (Buffer.isBuffer(body))
      body = body.toString('base64');

    var data = req.params && req.params.pretty !== undefined ? JSON.stringify(body, null, 2) : JSON.stringify(body);

    if (res.getHeader('Content-Length') === undefined &&
        res.contentLength === undefined) {
      res.setHeader('Content-Length', Buffer.byteLength(data));
    }

    return data;
  }

  var run = function() {
    var seaServer = seaport.createServer();
    seaServer.listen(config.seaport.port);

    // Check if there are any other servers already running and if there are, cluster up.
    http.get('http://' + config.seaport.host + ':' + config.coordinator.port + '/status', function(res){
      if (res.statusCode === 200) {
        seaServer.peer(config.seaport.host + ":" + config.seaport.port);
      }
    });


    var sitter = new AgentBabysitter(
      seaServer, 
      function(config){ 
        return new AgentClient(restify, config); 
      }, 
      config.coordinator
    );

    var server = restify.createServer({
      name: 'Shio-Coordinator',
      formatters: {
        "application/json": prettyJson
      }
    });

    // Two standard restify handler plugins:
    server.use(restify.queryParser());
    server.use(restify.bodyParser({ mapParams : false }));

    // This function merely echoes everything it got as a block of text. Useful for debugging.
    server.get('/status', function(req, res, next) {
      res.send(200, 'OK');
      return next();
    });

    new ActionHandler(new SlotActions(sitter)).register('/slots', server);
    new ActionHandler(new ServerActions(sitter)).register('/servers', server);

    var port = config.coordinator.port;
    log.info('Shio-Coordinator serving on port[%s]', port);
    server.listen(port);
    server.on('uncaughtException', function(req, res, route, error){
      log.warn(error, "Uncaught Exception on req[%s] for route[%s %s]: %s", req.id(), route.spec.path, route.spec.method, error.message);
      res.send(500, util.format("Server Error: %s", req.id()));
    });
  }

  run();
}).call(this);
