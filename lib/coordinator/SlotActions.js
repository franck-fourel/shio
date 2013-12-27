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
var log = require('../log.js')('SlotActions.js');

var FILTERABLE_FIELDS = [
  'machine', 'slot', 'binary', 'binaryVersion', 'config', 'configVersion', 'state', 'host', 'osType', 'platform', 'arch'
];
/*
 * An object that encapsulates the various actions the coordinator does
 */
function SlotActions(babysitter) {
  this.sitter = babysitter;
}

SlotActions.prototype.assign = function(params, body, res, cb) {
  if (body.binary == null) {
    return cb("must provide a binary field");
  }

  if (body.config == null) {
    return cb("must provide a config field");
  }

  return this.doToServersAndUpdate(
    params,
    function(server, listing) {
      var client = server.client;
      var slot = listing.slot;

      var fns = []

      if (listing.state === 'RUNNING') {
        fns.push(client.stop.bind(client, slot));
      }

      fns.push(client.load.bind(client, slot, body.binary, body.config));

      if (! params.noStart) {
        fns.push(client.start.bind(client, slot));
      }

      return [async.series.bind(async, fns)];
    },
    cb
  );
}

SlotActions.prototype.unassign = function(params, body, res, cb) {
  return this.doToServersAndUpdate(
    params,
    function(server, listing) {
      var client = server.client;
      var id = listing.slot;
      return async.series.bind(async, [client.stop.bind(client, id), client.unload.bind(client, id)]);
    },
    cb
  );
}

SlotActions.prototype.start = function(params, body, res, cb) {
  return this.doToServersAndUpdate(
    params,
    function(server, listing) {
      return [server.client.start.bind(server.client, listing.slot)];
    },
    cb
  );
}

SlotActions.prototype.stop = function(params, body, res, cb) {
  return this.doToServersAndUpdate(
    params,
    function(server, listing) {
      return [server.client.stop.bind(server.client, listing.slot)];
    },
    cb
  );
}

SlotActions.prototype.show = function(params, body, res, cb) {
  res.json(this.filterListings(params));
  return cb();
}

SlotActions.prototype.filterListings = function(params) {
  var listings = this.sitter.listings();

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

SlotActions.prototype.doToServersAndUpdate = function(params, fn, cb) {
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
    subActions = subActions.concat(fn(server, listing));
  }

  async.parallel(subActions, function(err) {
      var updateActions = []
      for (var server in servers) {
        updateActions.push(self.sitter.updateListingsForServer.bind(self.sitter, server))
      }
      async.parallel(updateActions, function(ignoredErr) {
        if (err != null) {
          log.warn(err);
          if (typeof err === 'error') {
            return cb(err.message);
          } else {
            return cb(err);
          }
        }
        return cb();
      });
    }
  );
}

module.exports = SlotActions;