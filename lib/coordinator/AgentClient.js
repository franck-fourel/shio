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

function AgentClient(restify, config) {
	this.url = util.format('http://%s:%s', config.host, config.port);
 	this.jsonClient = restify.createJsonClient({
 		url : this.url,
 		retry : { retries : 0 } 
 	});
}

AgentClient.prototype.createSlot = function(id, cb) {
	this.doToSlot(id, { type: 'createSlot' }, cb);
}

AgentClient.prototype.deleteSlot = function(id, cb) {
	this.doToSlot(id, { type: 'deleteSlot' }, cb);
}

/**
 * Tells the agent to load a specific binarySpec and configSpec at a given id.
 *
 * cb is function(err)
 */
AgentClient.prototype.load = function(id, binarySpec, configSpec, cb) {
	this.doToSlot(id, { type: 'load', binary: binarySpec, config: configSpec }, cb);
}

/**
 * Tells the agent to unload a specific id.
 *
 * cb is function(err)
 */
AgentClient.prototype.unload = function(id, cb) {
	this.doToSlot(id, { type: 'unload' }, cb);
}

/**
 * Tells the agent to start a specific id.
 *
 * cb is function(err)
 */
AgentClient.prototype.start = function(id, cb) {
	this.doToSlot(id, { type: 'start' }, cb);
}

/**
 * Tells the agent to start a specific id.
 *
 * cb is function(err)
 */
 AgentClient.prototype.stop = function(id, cb) {
 	 this.doToSlot(id, { type: 'stop' }, cb);
 }

/**
 * Generic method for calling the process endpoint on an Agent.
 *
 * cb is a function(err, req, res, result)
 */
AgentClient.prototype.doToSlot = function(id, payload, cb) {
	if (id == null) {
		return cb("Must specify a slot id");
	}
	this.jsonClient.post(util.format("/slots/%s", id), payload, cb);
}

/**
 * Gets the current listings from the remote agent and calls cb with them.
 *
 * signature of cb is function(err, results)
 */
AgentClient.prototype.slots = function (cb) {
	this.jsonClient.get('/slots', function(err, req, res, result) {
		cb(err, result);
	});
}

/**
 * Override the behavior of util.inspect()
 */
AgentClient.prototype.inspect = function(depth) {
	return this.url;
}

module.exports = AgentClient;