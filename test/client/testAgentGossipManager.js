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
var mockableObject = fixture.mockableObject;
var sinon = fixture.sinon;

describe('agentGossipManager.js', function(){
  var agent = {billy: 'hi'};
  var config = { host: 'localhost', heartbeatDuration: 60000 };
  var polling = mockableObject.make('repeat');
  var factory = sinon.stub();
  var parentClient = mockableObject.make('getCoordinators');

  var agentGossipManager;

  beforeEach(function(){
    mockableObject.reset(polling, parentClient);
    factory.reset();

    factory.returns(parentClient);
    agentGossipManager = require('../../lib/agent/agentGossipManager.js')(agent, factory, polling, config);
    expect(factory).have.been.calledOnce;
    factory.reset();
  });

  it('starts empty', function() {
    expect(agentGossipManager.getCurrCoordinators()).is.empty;
  });

  it('registers a poller to collect a set of coordinators on start()', function(){
    sinon.stub(polling, 'repeat');
    agentGossipManager.start();

    expect(agentGossipManager.getCurrCoordinators()).is.empty;
    expect(polling.repeat).have.been.calledOnce;
    expect(polling.repeat).have.been.calledWith(
      'coordinator finder', sinon.match.func, config.heartbeatDuration
    );

    sinon.stub(parentClient, 'getCoordinators');
    parentClient.getCoordinators.callsArgWith(0, null, [{host: 'localhost'}]);

    var client = mockableObject.make('getCoordinators');
    sinon.stub(client, 'getCoordinators')
         .callsArgWith(0,   null, [{host: 'localhost'}, {host: 'remotehost'}]);

    factory.returns(client);
    polling.repeat.getCall(0).args[1](function(){});

    expect(agentGossipManager.getCurrCoordinators()).deep.equals(['localhost', 'remotehost']);
    expect(polling.repeat).have.been.calledThrice;
  });

  it('registers a poller to collect a set of coordinators on start()', function(){
    sinon.stub(polling, 'repeat');
    agentGossipManager.start();

    expect(agentGossipManager.getCurrCoordinators()).is.empty;
    expect(polling.repeat).have.been.calledOnce;
    expect(polling.repeat).have.been.calledWith(
      'coordinator finder', sinon.match.func, config.heartbeatDuration
    );

    sinon.stub(parentClient, 'getCoordinators');
    parentClient.getCoordinators.callsArgWith(0, null, [{host: 'localhost'}]);

    var client = mockableObject.make('getCoordinators');
    sinon.stub(client, 'getCoordinators')
         .callsArgWith(0, null, [{host: 'localhost2'}, {host: 'remotehost'}]);
    factory.withArgs({ host: 'localhost' }).returns(client);

    var localClient = mockableObject.make('agentHeartbeat');
    var remoteClient = mockableObject.make('agentHeartbeat', 'getHost');
    factory.withArgs({ host: 'localhost2' }).returns(localClient);
    factory.withArgs({ host: 'remotehost' }).returns(remoteClient);

    var pollFn = polling.repeat.getCall(0).args[1];

    mockableObject.reset(polling);
    sinon.stub(polling, 'repeat');

    pollFn(function(){});

    expect(agentGossipManager.getCurrCoordinators()).deep.equals(['localhost2', 'remotehost']);
    expect(polling.repeat).have.been.calledTwice;
    expect(polling.repeat.getCall(0)).have.been.calledWith(
      'localhost2 heartbeat', sinon.match.func, config.heartbeatDuration
    );
    expect(polling.repeat.getCall(1)).have.been.calledWith(
      'remotehost heartbeat', sinon.match.func, config.heartbeatDuration
    );

    sinon.stub(localClient, 'agentHeartbeat').callsArgWith(1, null);
    polling.repeat.getCall(0).args[1](function(err){
      expect(err).eql(null);
    });
    expect(localClient.agentHeartbeat).have.been.calledOnce;
    expect(localClient.agentHeartbeat).have.been.calledWith(agent, sinon.match.func);

    sinon.stub(remoteClient, 'agentHeartbeat').callsArgWith(1, 'fail!');
    sinon.stub(remoteClient, 'getHost').returns('remotehost');
    polling.repeat.getCall(1).args[1](function(err){
      expect(err).equals('fail!');
    });
    expect(remoteClient.agentHeartbeat).have.been.calledOnce;
    expect(remoteClient.agentHeartbeat).have.been.calledWith(agent, sinon.match.func);
  });
});