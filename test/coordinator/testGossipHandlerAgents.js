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

var fixture = require('salinity');

var expect = fixture.expect;
var sinon = fixture.sinon;
var mockableObject = fixture.mockableObject;

describe("gossipHandlerAgents.js", function(){
  var factory = require('../../lib/coordinator/gossipHandlerAgents.js');

  var config = {heartbeatDuration: 60000};
  var gossipHandler;
  var heartbeatFn;

  var polling = mockableObject.make("repeat");
  var timeProvider = mockableObject.make("getTime");

  describe("agents", function(){
    beforeEach(function() {
      mockableObject.reset(polling, timeProvider);

      sinon.stub(polling, "repeat");
      gossipHandler = factory(config, polling, timeProvider);

      expect(polling.repeat).have.been.calledOnce;
      expect(polling.repeat).have.been.calledWith(
        "agent heartbeat", sinon.match.func, config.heartbeatDuration
      );

      heartbeatFn = polling.repeat.getCall(0).args[1];

      mockableObject.reset(polling);
    });

    it("should start with no agents", function() {
      expect(gossipHandler.getAgentHosts()).is.empty;
    });

    var agent1 = {host: 'localhost:2223', name: '770'};
  
    it("should be able to be added", function() {
      sinon.stub(timeProvider, "getTime").returns(new Date().getTime());
      gossipHandler.addAgent(agent1);
      hasAgents(agent1);
    });

    it("should be able to add an agent via heartbeat", function(){
      sinon.stub(timeProvider, "getTime").returns(new Date().getTime());
      gossipHandler.agentHeartbeat(agent1);
      hasAgents(agent1);
    });

    it("should automatically remove agents based on a lack of heartbeats", function() {
      var anotherAgent = {host: 'localhost:2224', name:'007'};

      sinon.stub(timeProvider, "getTime");

      timeProvider.getTime.returns(0);
      gossipHandler.addAgent(agent1);

      timeProvider.getTime.returns(config.heartbeatDuration * 10);
      gossipHandler.addAgent(anotherAgent);
      hasAgents(agent1, anotherAgent);

      var heartbeatCheckAt = function(time) {
        timeProvider.getTime.returns(time);
        heartbeatFn(function(){});
      }

      heartbeatCheckAt(config.heartbeatDuration);
      hasAgents(agent1, anotherAgent);

      heartbeatCheckAt(config.heartbeatDuration * 3);
      hasAgents(agent1, anotherAgent);

      heartbeatCheckAt((config.heartbeatDuration * 3) + 1);
      hasAgents(anotherAgent);

      heartbeatCheckAt(config.heartbeatDuration * 13);
      hasAgents(anotherAgent);

      timeProvider.getTime.returns((config.heartbeatDuration * 13));
      gossipHandler.agentHeartbeat(anotherAgent);
      heartbeatCheckAt((config.heartbeatDuration * 13) + 1);
      hasAgents(anotherAgent);

      heartbeatCheckAt(config.heartbeatDuration * 16);
      hasAgents(anotherAgent);

      heartbeatCheckAt((config.heartbeatDuration * 16) + 1);
      expect(gossipHandler.getAgentHosts()).is.empty;
    });
  });

  function hasAgents() {
    var hosts = [];
    for (var i = 0; i < arguments.length; ++i) {
      hosts.push(arguments[i].host);
    }

    expect(gossipHandler.getAgentHosts()).to.deep.equal(hosts);
    for (i = 0; i < arguments.length; ++i) {
      expect(gossipHandler.getAgent(hosts[i])).to.deep.equal(arguments[i]);
    }
  }
});