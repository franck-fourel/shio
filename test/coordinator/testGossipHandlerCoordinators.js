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

var fixture = require('salinity');

var expect = fixture.expect;
var sinon = fixture.sinon;
var mockableObject = fixture.mockableObject;

var makeClient = function(){
  return mockableObject.make('getCoordinators', 'addCoordinator', 'getHost');
};

describe('gossipHandlerCoordinators.js', function(){
  var factory = require('../../lib/coordinator/gossipHandlerCoordinators.js');

  var self = {host: 'localhost:1234', name: 'test'};
  var config = {host: 'coordinator.lb', port: 1234, heartbeatDuration: 60000};
  var gossipHandler;

  var coordinatorClientFactory = sinon.stub();
  var polling = mockableObject.make('repeat');

  it('should start resyncing on construction', function(){
    coordinatorClientFactory.reset();
    mockableObject.reset(polling);

    sinon.stub(polling, 'repeat');

    var client = makeClient();
    coordinatorClientFactory.returns(client);
    gossipHandler = factory(self, config, coordinatorClientFactory, polling);
    expect(gossipHandler).to.exist;

    expect(polling.repeat).have.been.calledOnce;
    expect(polling.repeat).have.been.calledWith('resync', sinon.match.func, config.heartbeatDuration * 10);

    // It should have itself registered right now
    expect(gossipHandler.getCoordinators()).to.deep.equal([self]);

    // Setup the client to return a new coordinator
    var newCoordinator = {host: 'localhost:2222'};
    sinon.stub(client, 'getCoordinators').callsArgWith(0, null, [newCoordinator]);

    // The new coordinator list won't have 'me', so it should try to register itself
    sinon.stub(client, 'addCoordinator').callsArg(1);

    // Call the 'repeat' fn with a new coordinator
    polling.repeat.getCall(0).args[1](function(arg){ expect(arg).undefined; });

    expect(gossipHandler.getCoordinators()).to.deep.equal([self, newCoordinator]);
    expect(client.addCoordinator).have.been.calledOnce;
    expect(client.addCoordinator).have.been.calledWith(self);
  });

  describe('post-construction', function(){
    beforeEach(function() {
      coordinatorClientFactory.reset();
      mockableObject.reset(polling);

      sinon.stub(polling, 'repeat');
      coordinatorClientFactory.returns(null);
      gossipHandler = factory(self, config, coordinatorClientFactory, polling);

      coordinatorClientFactory.reset();
      mockableObject.reset(polling);
    });

    describe('coordinators', function(){
      it('should be able to add a new coordinator and start polling it.', function() {
        var coordinator = {host: 'localhost:2222', name: 'billybill'};

        var client = makeClient();
        coordinatorClientFactory.returns(client);
        sinon.stub(polling, 'repeat');

        gossipHandler.addCoordinator(coordinator);
        expect(gossipHandler.getCoordinators()).to.deep.equal([self, coordinator]);
        expect(polling.repeat).have.been.calledWith(sinon.match.string, sinon.match.func, config.heartbeatDuration);

        // Setup the client to return a new coordinator
        var newCoordinator = {host: 'localhost', port: 22222};
        sinon.stub(client, 'getCoordinators').callsArgWith(0, null, [newCoordinator]);

        // Call the 'repeat' fn with a new coordinator
        polling.repeat.getCall(0).args[1](function(arg){ expect(arg).undefined; });

        expect(gossipHandler.getCoordinators()).to.deep.equal([self, coordinator, newCoordinator]);
      });
    });
  });
});