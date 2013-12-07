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

var log = require('../log.js')('AgentBabysitter.js');

function AgentBabysitter( seaport, agentClientFactory, config) {
  this.seaport = seaport;
  this.agentClientFactory = agentClientFactory;
  this.config = config;
  this.servers = {};

  setTimeout(this.watchListings.bind(this), 1000);
}

AgentBabysitter.prototype.listServers = function() {
  var retVal = [];
  for (var id in this.servers) {
    var server = this.servers[id];
    retVal.push(this.servers[id].meta);
  }
  return retVal;
}

AgentBabysitter.prototype.server = function(name) {
  return this.servers[name];
}

AgentBabysitter.prototype.listings = function() {
  var output = [];
  for (var id in this.servers) {
    var server = this.servers[id];
    var slots = server.slots;
    for (var slot in slots) {
      output.push({
        machine: id,
        slot: slot,
        binary: slots[slot].binary.name,
        binaryVersion: slots[slot].binary.version,
        config: slots[slot].config.name,
        configVersion: slots[slot].config.version,
        state: slots[slot].state,
        host: server.meta.host,
        osType: server.meta.osType,
        platform: server.meta.platform,
        arch: server.meta.arch,
        cpus: server.meta.cpus,
        mem: server.meta.mem
      });
    }
  }
  return output;
}

AgentBabysitter.prototype.checkListings = function() {
  var self = this;
  var servers = this.seaport.query('shio-agent');
  var currServers = {};

  for (var i = 0; i < servers.length; ++i) {
    var server = servers[i];
    var name = server.payload.hostname;

    if (this.servers[name] == null) {
      log.info("New server found! [%j]", server);
      this.servers[name] = {
        client : this.agentClientFactory({ host: server.host, port: server.port }),
        meta : {
          machine : server.payload.hostname,
          host : server.host,
          osType : server.payload.osType,
          platform : server.payload.platform,
          arch : server.payload.arch,
          cpus : server.payload.cpus,
          mem : server.payload.mem,
          state : 'RUNNING'
        }
      };
    }
  }

  for (var server in this.servers) {
    this.updateListingsForServer(server, function(err){
      if (err != null) {
        log.info("Server[%s] disdappeared.", server);
        self.servers[server].meta.state = "DISDAPPEARED";
      }
    });
    currServers[name] = true;
  }
}

AgentBabysitter.prototype.updateListingsForServer = function(name, cb) {
  var self = this;

  log.info("Updating listings for server[%s]", name);

  var client = this.servers[name].client;
  client.slots(function (err, results) {
    if (err == null) {
      self.setSlots(name, results);
    }
    else {
      log.warn(err, "Problem talking to server[%s] at [%s]", name, client.getUrl());
    }

    if (cb != null) {
      return cb(err);
    }
  });
}

AgentBabysitter.prototype.setSlots = function(name, slots) {
  if (this.servers[name] == null) {
    this.servers[name] = {};
  }
  this.servers[name].slots = slots;
}

AgentBabysitter.prototype.watchListings = function() {
  if (this.watching) return;
  this.watching = true;

  var self = this;

  this.checkListings();
  setTimeout(
    function(){
      self.watching = false;
      self.watchListings();
    },
    this.config.childPollDuration
  ).unref();
}

module.exports = AgentBabysitter;