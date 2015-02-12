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

var delegateCb = function(cb) {
  return function(err, req, res, result) {
    return cb(err, result);
  };
};

function CoordinatorClient(jsonHttpClient) {
  this.jsonHttpClient = jsonHttpClient;
}

CoordinatorClient.prototype.assign = function(name, id, binary, config, cb) {
  this.actOnServer(name, id, { type : 'assign', binary: binary, config: config}, cb);
};

CoordinatorClient.prototype.unassign = function(name, id, cb) {
  this.actOnServer(name, id, { type : 'unassign' }, cb);
};

CoordinatorClient.prototype.start = function(name, id, cb) {
  this.actOnServer(name, id, { type : 'start'}, cb);
};

CoordinatorClient.prototype.stop = function(name, id, cb) {
  this.actOnServer(name, id, { type : 'stop'}, cb);
};

CoordinatorClient.prototype.actOnServer = function(name, id, payload, cb) {
  this.jsonHttpClient.post(util.format('/servers/%s/%s', name, id), payload, delegateCb(cb));
};

CoordinatorClient.prototype.listings = function(cb) {
  this.jsonHttpClient.get('/listings', delegateCb(cb));
};

CoordinatorClient.prototype.servers = function(cb) {
  this.jsonHttpClient.get('/servers', delegateCb(cb));
};

module.exports = CoordinatorClient;