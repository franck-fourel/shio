var fixture = require('../fixture.js');
var mockableObject = require('../mockableObject.js');

var expect = fixture.expect;
var sinon = fixture.sinon;

describe("coordinatorPoller.js", function(){
  var agent = {billy: 'hi'};
  var config = { host: 'localhost', heartbeatDuration: 60000 };
  var polling = mockableObject.make('repeat');
  var factory = sinon.stub();
  var parentClient = mockableObject.make('getCoordinators');

  var coordinatorPoller;

  beforeEach(function(){
    mockableObject.reset(polling, parentClient);
    factory.reset();

    factory.returns(parentClient);
    coordinatorPoller = require('../../lib/agent/coordinatorPoller.js')(agent, factory, polling, config);
    expect(factory).have.been.calledOnce;
    factory.reset();
  });

  it("starts empty", function() {
    expect(coordinatorPoller.getCurrCoordinators()).is.empty;
  });

  it("registers a poller to collect a set of coordinators on start()", function(){
    sinon.stub(polling, 'repeat');
    coordinatorPoller.start();

    expect(coordinatorPoller.getCurrCoordinators()).is.empty;
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

    expect(coordinatorPoller.getCurrCoordinators()).deep.equals(['localhost', 'remotehost']);
    expect(polling.repeat).have.been.calledThrice;
  });

  it("registers a poller to collect a set of coordinators on start()", function(){
    sinon.stub(polling, 'repeat');
    coordinatorPoller.start();

    expect(coordinatorPoller.getCurrCoordinators()).is.empty;
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

    expect(coordinatorPoller.getCurrCoordinators()).deep.equals(['localhost2', 'remotehost']);
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