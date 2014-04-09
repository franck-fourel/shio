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

var util = require('util');

var log = require('../log.js')('AgentBabysitter.js');

function AgentBabysitter( gossip, agentClientFactory, config) {
  log.info("Babysitter running with config[%j]", config);

  this.gossip = gossip;
  this.agentClientFactory = agentClientFactory;
  this.config = config;
  this.servers = {};

  setTimeout(this.watchListings.bind(this), 1000);
}

AgentBabysitter.prototype.listServers = function() {
  var self = this;
  return Object.keys(this.servers).map(function(name){
    return self.servers[name].meta;
  });
};

AgentBabysitter.prototype.server = function(name) {
  return this.servers[name];
};

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
};

AgentBabysitter.prototype.checkListings = function() {
  var self = this;
  var servers = this.gossip.getAgentHosts();
  var currServers = {};

  for (var i = 0; i < servers.length; ++i) {
    var server = this.gossip.getAgent(servers[i]);
    var name = server.hostname;

    if (this.servers[name] == null) {
      log.info("New server found! [%j]", server);
      this.servers[name] = {
        client : this.agentClientFactory({ host: server.host, port: server.port }),
        meta : {
          machine : server.hostname,
          host : server.host,
          osType : server.osType,
          platform : server.platform,
          arch : server.arch,
          cpus : server.cpus,
          mem : server.mem,
          state : 'RUNNING'
        }
      };
    }
  }

  for (var server in this.servers) {
    this.updateListingsForServer(server, function(theServer){ 
      return function(err){
        if (err != null) {
          log.info("Server[%s] disdappeared.", theServer);
          Object.keys(self.servers[theServer].slots).forEach(function(slot){
            self.servers[theServer].slots[slot].state = 'SERVER_GONEDID';
          });
          self.servers[theServer].meta.state = "DISDAPPEARED";
        }
      }
    }(server));
    currServers[name] = true;
  }
};

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
};

AgentBabysitter.prototype.setSlots = function(name, slots) {
  if (this.servers[name] == null) {
    this.servers[name] = {};
  }
  this.servers[name].slots = slots;
};

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
};

module.exports = AgentBabysitter;