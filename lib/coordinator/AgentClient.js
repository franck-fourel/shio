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

var util = require('util');

function AgentClient(restify, config) {
  this.url = util.format('http://%s:%s', config.host, config.port);
   this.jsonClient = restify.createJsonClient({
     url : this.url,
     retry : { retries : 0 }
   });
}

AgentClient.prototype.createSlot = function(id, cb) {
  this.doToSlot(id, { type: 'createSlot' }, cb);
};

AgentClient.prototype.deleteSlot = function(id, cb) {
  this.doToSlot(id, { type: 'deleteSlot' }, cb);
};

/**
 * Tells the agent to load a specific binarySpec and configSpec at a given id.
 *
 * cb is function(err)
 */
AgentClient.prototype.load = function(id, binarySpec, configSpec, cb) {
  this.doToSlot(id, { type: 'load', binary: binarySpec, config: configSpec }, cb);
};

/**
 * Tells the agent to unload a specific id.
 *
 * cb is function(err)
 */
AgentClient.prototype.unload = function(id, cb) {
  this.doToSlot(id, { type: 'unload' }, cb);
};

/**
 * Tells the agent to start a specific id.
 *
 * cb is function(err)
 */
AgentClient.prototype.start = function(id, cb) {
  this.doToSlot(id, { type: 'start' }, cb);
};

/**
 * Tells the agent to start a specific id.
 *
 * cb is function(err)
 */
 AgentClient.prototype.stop = function(id, cb) {
    this.doToSlot(id, { type: 'stop' }, cb);
 };

/**
 * Generic method for calling the process endpoint on an Agent.
 *
 * cb is a function(err, req, res, result)
 */
AgentClient.prototype.doToSlot = function(id, payload, cb) {
  if (id == null) {
    return cb('Must specify a slot id');
  }
  this.jsonClient.post(util.format('/slots/%s', id), payload, cb);
};

/**
 * Gets the current listings from the remote agent and calls cb with them.
 *
 * signature of cb is function(err, results)
 */
AgentClient.prototype.slots = function (cb) {
  this.jsonClient.get('/slots', function(err, req, res, result) {
    return cb(err, result);
  });
};

/**
 * return the URL that the client uses
 */
AgentClient.prototype.getUrl = function(depth) {
  return this.url;
};

module.exports = AgentClient;