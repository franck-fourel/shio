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

  var ActionHandler = require('./ActionHandler.js');
  var config = require('./config.js').loadConfig('./config.json');
  var log = require('./log.js')('coordinator.js');

  var AgentBabysitter = require('./coordinator/AgentBabysitter.js');
  var AgentClient = require('./coordinator/AgentClient.js');
  var coordinatorServer = require("./coordinator/CoordinatorServer.js");
  var SlotActions = require('./coordinator/SlotActions.js');
  var ServerActions = require('./coordinator/ServerActions.js');

  var ifExists = function(path){
    return fs.exists(path) ? path : null;
  };


  function run() {
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

    var gossipServer = restify.createServer({
      name: 'gossip',
      formatters: {
        "application/json": prettyJson
      }
    });

    
    coordinatorServer(restify, common, sitter, config).start();
  }

  run();
}).call(this);
