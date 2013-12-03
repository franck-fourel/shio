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

var async = require('async');
var util = require('util');

var fn = require('../fn.js');
var log = require('../log.js')('ServerActions.js');

var FILTERABLE_FIELDS = [
  'machine', 'host', 'osType', 'platform', 'arch'
];
/*
 * An object that encapsulates the various actions the coordinator does
 */
function ServerActions(babysitter) {
  this.sitter = babysitter;
}

ServerActions.prototype.createSlot = function(params, body, res, cb) {
  return this.doToServersAndUpdate(
    params,
    function(server) {
      return [server.client.createSlot.bind(server.client, body.id)];
    },
    cb
  );
}

ServerActions.prototype.deleteSlot = function(params, body, res, cb) {
  return this.doToServersAndUpdate(
    params,
    function(server) {
      return [server.client.deleteSlot.bind(server.client, body.id)];
    },
    cb
  );
}


ServerActions.prototype.show = function(params, body, res, cb) {
  res.json(this.filterListings(params));
  cb();
}

ServerActions.prototype.filterListings = function(params) {
  var listings = this.sitter.listServers();

  var filterFn = function(field, listings) {
    if (params[field] != null) {
      return listings.filter(fn.compose(fn.equals(params[field]), fn.accessor(field)));
    }
    return listings;
  }

  for (var i = 0; i < FILTERABLE_FIELDS.length; ++i) {
    listings = filterFn(FILTERABLE_FIELDS[i], listings);
  }

  return listings;
}

ServerActions.prototype.doToServersAndUpdate = function(params, fn, cb) {
  var self = this;
  var listings = this.filterListings(params);

  var subActions = [];
  var servers = {};

  for (var i = 0; i < listings.length; ++i) {
    var listing = listings[i];
    var name = listing.machine;

    if (servers[name] == null) {
      servers[name] = this.sitter.server(name);
    }

    var server = servers[name];
    subActions = subActions.concat(fn(server, listing.id));
  }

  async.parallel(subActions, function(err) {
      var updateActions = []
      for (var server in servers) {
        updateActions.push(self.sitter.updateListingsForServer.bind(self.sitter, server));
      }
      async.parallel(updateActions, function(ignoredErr) {
        if (ignoredErr != null) {
          log.warn("There was a problem updating a server, ignoring.", ignoredErr.message);
        }
        if (err != null) {
          log.warn(err, "There was an error running an action: %s", err.message);
          return cb(err.message);
        }
        cb();
      });
    }
  );
}

module.exports = ServerActions;