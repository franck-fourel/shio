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

var util = require('util');

var log = require('./log.js')('ActionHandler.js')

/*
 * An ActionHandler is a handler that provides an HTTP endpoint which dispatches requests
 * to a delegate "actions" object based on an incoming JSON object.
 *
 * "actions" is an object with a function for each field that you want to be callable.
 * The function signature is the params from the request, the body of the request, the restify response 
 * and a callback.  A successful call should complete the response object and call the callback with no 
 * arguments.  A failed call should call the callback with a single error String.
 *
 * Automatically registers a GET handler along with the POST handler.  The GET handler delegates to the
 * "show" action.
 */
function ActionHandler(actions) {
  this.actions = actions;
}

ActionHandler.prototype.register = function(endpoint, restifyServer) {
  restifyServer.get(endpoint, this.run.bind(this, 'show'))
  restifyServer.post(endpoint, this.handle.bind(this));
}

ActionHandler.prototype.handle = function(req, res, next) {
  return this.run(req.body.type, req, res, next);
}

ActionHandler.prototype.run = function(type, req, res, next) {
  var nextCb = function(err) {
    if (err != null) {
      var errMessage
      if (typeof(err) === 'error') {
        errMessage = util.format('Problem running action[%j].', req.body)
        log.error(err, errMessage);
      }
      else {
        errMessage = err;
      }
      res.send(400, errMessage);
    }
    if (! res.headersSent) {
      res.send(200);
    }
    return next();
  }

  var action = this.actions[type];
  if (action == null) {
    return nextCb('Unknown Type: ' + type);
  }
  return action.call(this.actions, req.params, req.body, res, nextCb);
}

module.exports = ActionHandler;