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

var log = require('../log.js')('ActionHandler.js');

/*
 * An ActionHandler is a handler that provides an HTTP endpoint which dispatches requests
 * to a delegate 'actions' object based on an incoming JSON object.
 *
 * 'actions' is an object with a function for each field that you want to be callable.
 * The function signature is the params from the request, the body of the request, the restify response
 * and a callback.  A successful call should complete the response object and call the callback with no
 * arguments.  A failed call should call the callback with a single error String.
 *
 * Automatically registers a GET handler along with the POST handler.  The GET handler delegates to the
 * 'show' action.
 */
function ActionHandler(actions) {
  this.actions = actions;
}

ActionHandler.prototype.register = function(endpoint, restifyServer) {
  restifyServer.get(endpoint, this.run.bind(this, 'show'));
  restifyServer.post(endpoint, this.handle.bind(this));
};

ActionHandler.prototype.handle = function(req, res, next) {
  return this.run(req.body.type, req, res, next);
};

ActionHandler.prototype.run = function(type, req, res, next) {
  var nextCb = function(err) {
    if (err != null) {
      var errMessage;
      errMessage = err;
      res.send(400, errMessage);
      return next();
    }

    log.info('Done running action[%j]', req.body);
    if (! res.headersSent) {
      res.send(200);
    }
    return next();
  };

  var action = this.actions[type];
  if (action == null) {
    return nextCb('Unknown Type: ' + type);
  }
  log.info('Running action[%j]', req.body);
  return action.call(this.actions, req.params, req.body, res, nextCb);
};

module.exports = ActionHandler;