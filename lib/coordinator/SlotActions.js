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

      var fns = [];

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
};

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
};

SlotActions.prototype.start = function(params, body, res, cb) {
  return this.doToServersAndUpdate(
    params,
    function(server, listing) {
      return [server.client.start.bind(server.client, listing.slot)];
    },
    cb
  );
};

SlotActions.prototype.stop = function(params, body, res, cb) {
  return this.doToServersAndUpdate(
    params,
    function(server, listing) {
      return [server.client.stop.bind(server.client, listing.slot)];
    },
    cb
  );
};

SlotActions.prototype.updateBinary = function(params, body, res, cb) {
  if (body.binaryVersion == null) {
    return cb("must provide a binaryVersion");
  }

  return this.doToServersAndUpdate(
    params,
    function(server, listing) {
      var client = server.client;
      var slot = listing.slot;

      var fns = [];

      if (listing.state === 'RUNNING') {
        fns.push(client.stop.bind(client, slot));
      }

      var binaryPayload = {
        name: listing.binary,
        version: body.binaryVersion
      };

      var configPayload = {
        name: listing.config,
        version: listing.configVersion
      };

      fns.push(client.load.bind(client, slot, binaryPayload, configPayload));

      if (! params.noStart) {
        fns.push(client.start.bind(client, slot));
      }

      return [async.series.bind(async, fns)];
    },
    cb
  );
};

SlotActions.prototype.updateConfig = function(params, body, res, cb) {
  if (body.configVersion == null) {
    return cb("must provide a configVersion");
  }

  return this.doToServersAndUpdate(
    params,
    function(server, listing) {
      var client = server.client;
      var slot = listing.slot;

      var fns = [];

      if (listing.state === 'RUNNING') {
        fns.push(client.stop.bind(client, slot));
      }

      var binaryPayload = {
        name: listing.binary,
        version: listing.binaryVersion
      };

      var configPayload = {
        name: listing.config,
        version: body.configVersion
      };

      fns.push(client.load.bind(client, slot, binaryPayload, configPayload));

      if (! params.noStart) {
        fns.push(client.start.bind(client, slot));
      }

      return [async.series.bind(async, fns)];
    },
    cb
  );
};

SlotActions.prototype.show = function(params, body, res, cb) {
  res.json(this.filterListings(params));
  return cb();
};

SlotActions.prototype.filterListings = function(params) {
  var listings = this.sitter.listings();

  var filterFn = function(field, listings) {
    if (params[field] != null) {
      return listings.filter(fn.compose(fn.equals(params[field]), fn.accessor(field)));
    }
    return listings;
  };

  for (var i = 0; i < FILTERABLE_FIELDS.length; ++i) {
    listings = filterFn(FILTERABLE_FIELDS[i], listings);
  }

  return listings;
};

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
      var updateActions = [];
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
};

module.exports = SlotActions;