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

var ActionHandler = require('../common/ActionHandler.js');
var SlotActions = require('./SlotActions.js');
var ServerActions = require('./ServerActions.js');

module.exports = function(serverFactory, sitter, config) 
{  
  var server = serverFactory.makeServer('Shio-Coordinator', config);

  server.withRestifyServer(function(restify){
    new ActionHandler(new SlotActions(sitter)).register('/slots', restify);
    new ActionHandler(new ServerActions(sitter)).register('/servers', restify);
  });

  return {
    start: server.start
  };
};