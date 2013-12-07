var fixture = require('./fixture.js');

var expect = fixture.expect;
var sinon = fixture.sinon;
var mockableObject = fixture.mockableObject;

var makeClient = function(){
  return mockableObject.make("getCoordinators", "getHost");
}

describe("GossipHandler.js", function(){
  var factory = require('../lib/coordinator/gossipHandler.js');

  var self = {host: 'localhost', port: 1234, name: 'test'};
  var config = {host: 'coordinator.lb', port: 1234, pollDuration: 60000};
  var gossipHandler;

  var coordinatorClientFactory = sinon.stub();
  var polling = mockableObject.make("repeat");

  it("should start resyncing on construction", function(){
    coordinatorClientFactory.reset();
    mockableObject.reset(polling);

    sinon.stub(polling, "repeat");
    
    var client = makeClient();
    coordinatorClientFactory.returns(client);
    gossipHandler = factory(self, config, coordinatorClientFactory, polling);
    expect(gossipHandler).to.exist;

    expect(polling.repeat).have.been.calledOnce;
    expect(polling.repeat).have.been.calledWith('resync', sinon.match.func, config.pollDuration * 10);

    // It should have itself registered right now
    expect(gossipHandler.getCoordinators()).to.deep.equal([self]);

    // Setup the client to return a new coordinator
    var newCoordinator = {host: 'localhost', port: 2222}
    sinon.stub(client, "getCoordinators").callsArgWith(0, null, [newCoordinator]);

    // Call the "repeat" fn with a new coordinator
    polling.repeat.getCall(0).args[1](function(arg){ expect(arg).undefined });

    expect(gossipHandler.getCoordinators()).to.deep.equal([self, newCoordinator]);
  });

  describe("post-construction", function(){
    beforeEach(function() {
      coordinatorClientFactory.reset()
      mockableObject.reset(polling);

      sinon.stub(polling, "repeat");
      coordinatorClientFactory.returns(null);
      gossipHandler = factory(self, config, coordinatorClientFactory, polling);

      coordinatorClientFactory.reset();
      mockableObject.reset(polling);
    });

    describe("coordinators", function(){
      it("should be able to add a new coordinator and start polling it.", function() {
        var coordinator = {host: 'localhost', port: 2222, name: 'billybill'};

        var client = makeClient();
        coordinatorClientFactory.returns(client);
        sinon.stub(polling, "repeat");

        gossipHandler.addCoordinator(coordinator);
        expect(gossipHandler.getCoordinators()).to.deep.equal([self, coordinator]);
        expect(polling.repeat).have.been.calledWith(sinon.match.string, sinon.match.func, config.pollDuration);

        // Setup the client to return a new coordinator
        var newCoordinator = {host: 'localhost', port: 22222}
        sinon.stub(client, "getCoordinators").callsArgWith(0, null, [newCoordinator]);

        // Call the "repeat" fn with a new coordinator
        polling.repeat.getCall(0).args[1](function(arg){ expect(arg).undefined });

        expect(gossipHandler.getCoordinators()).to.deep.equal([self, coordinator, newCoordinator]);
      });
    });

    describe("agents", function() {
      it("should start with no agents", function() {
        expect(gossipHandler.getAgentHosts()).is.empty;
      });

      var agent1 = {host: 'localhost', port: 2223, name: '770'};
      var getKey = function(obj) { return obj.host + ':' + obj.port };
    
      it("should be able to be added", function() {
        gossipHandler.addAgent(agent1);
        expect(gossipHandler.getAgentHosts()).to.deep.equal([getKey(agent1)]);
        expect(gossipHandler.getAgent(getKey(agent1))).to.deep.equal(agent1);
      });

      it("should be able to be removed", function() {
        var anotherAgent = {host: 'localhost', port: 2224, name:'007'};

        gossipHandler.addAgent(agent1);
        gossipHandler.addAgent(anotherAgent);

        expect(gossipHandler.getAgentHosts()).to.deep.equal([getKey(agent1), getKey(anotherAgent)]);
        expect(gossipHandler.getAgent(getKey(agent1))).to.deep.equal(agent1);
        expect(gossipHandler.getAgent(getKey(anotherAgent))).to.deep.equal(anotherAgent);

        gossipHandler.removeAgent(getKey(agent1));
        expect(gossipHandler.getAgentHosts()).to.deep.equal([getKey(anotherAgent)]);

        gossipHandler.removeAgent(getKey(anotherAgent));
        expect(gossipHandler.getAgentHosts()).is.empty;
      });
    });
  });
});