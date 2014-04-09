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
};

ServerActions.prototype.deleteSlot = function(params, body, res, cb) {
  return this.doToServersAndUpdate(
    params,
    function(server) {
      return [server.client.deleteSlot.bind(server.client, body.id)];
    },
    cb
  );
};

ServerActions.prototype.replicate = function(params, body, res, cb) {
  var serverToCopy = body.machine;
  if (serverToCopy == null) {
    return cb('must provide field[machine] as the server to replicate');
  }

  var servers = this.filterListings({ machine: serverToCopy });
  if (servers.length === 0) {
    return cb(util.format('Unknown server[%s]', serverToCopy));
  }
  if (servers.length > 1) {
    return cb(util.format('More than one server matched[%s], wtf? [%s]', serverToCopy, servers));
  }

  var slotsToInstall = this.sitter.server(servers[0]).slots;

  return this.doToServersAndUpdate(
    params,
    function(server) {
      var client = server.client;
      var ops = [];

      // Stop running processes
      ops.push(
        function(callback) {
          async.mapSeries(
            Object
              .keys(server.slots)
              .filter(function(slot){
                        return server.slots[slot].state === 'RUNNING';
                      }),
            client.stop.bind(client),
            callback
          );
        }
      );

      // Delete current slots
      ops.push(async.mapSeries.bind(async, Object.keys(server.slots), client.deleteSlot.bind(client)));

      // Create new slots
      ops.push(async.mapSeries.bind(async, Object.keys(slotsToInstall), client.createSlot.bind(client)));

      // Load!
      ops.push(
        function(callback) {
          async.mapSeries(
            Object.keys(slotsToInstall),
            function(slot, cally) {
              var slotInfo = slotsToInstall[slot];
              client.load(
                slot,
                {
                  name: slotInfo.binary,
                  version: slotInfo.binaryVersion
                },
                {
                  name: slotInfo.config,
                  version: slotInfo.configVersion
                },
                cally
              );
            },
            callback
          );
        }
      );

      // Start!
      ops.push(async.mapSeries.bind(async, Object.keys(slotsToInstall), client.start.bind(client)));

      return [ async.series.bind(async, ops) ];
    },
    cb
  );
};


ServerActions.prototype.show = function(params, body, res, cb) {
  res.json(this.filterListings(params));
  return cb();
};

ServerActions.prototype.filterListings = function(params) {
  var listings = this.sitter.listServers();

  var filterFn = function(field, listings) {
    if (params[field] != null) {
      return listings.filter(function(e){
        return params[field] === e[field];
      });
    }
    return listings;
  };

  for (var i = 0; i < FILTERABLE_FIELDS.length; ++i) {
    listings = filterFn(FILTERABLE_FIELDS[i], listings);
  }

  return listings;
};

ServerActions.prototype.doToServersAndUpdate = function(params, fn, cb) {
  var self = this;
  var serverListings = this.filterListings(params);

  var subActions = [];
  var servers = {};

  for (var i = 0; i < serverListings.length; ++i) {
    var name = serverListings[i].machine;

    if (servers[name] == null) {
      servers[name] = this.sitter.server(name);
    }
    subActions = subActions.concat(fn(servers[name]));
  }

  async.parallel(subActions, function(err) {
      var updateActions = [];
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
        return cb();
      });
    }
  );
};

module.exports = ServerActions;