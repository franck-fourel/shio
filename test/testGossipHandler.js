var expect = require('chai').expect;

describe("GossipHandler.js", function(){
  var factory = require('../lib/coordinator/GossipHandler.js');

  var self = {host: 'localhost', name: 'test'}
  var gossipHandler;

  beforeEach(function() {
    gossipHandler = factory.makeGossipHandler(self);
    expect(gossipHandler).to.exist;
  });

  describe("coordinators", function(){
    it("should start with self", function(){
      expect(gossipHandler.getCoordinators()).to.deep.equal([self]);
    });

    it("should be able to add a new coordinator", function() {
      var coordinator = {host: 'localhost:2222', name: 'billybill'};

      gossipHandler.addCoordinator(coordinator);
      expect(gossipHandler.getCoordinators()).to.deep.equal([self, coordinator]);
    });
  });

  describe("agents", function() {
    it("should start with no agents", function() {
      expect(gossipHandler.getAgentHosts()).is.empty;
    });

    var agent1 = {host: 'localhost:2223', name: '770'};
  
    it("should be able to add an agent", function() {
      gossipHandler.addAgent(agent1);
      expect(gossipHandler.getAgentHosts()).to.deep.equal([agent1.host]);
      expect(gossipHandler.getAgent(agent1.host)).to.deep.equal(agent1);
    });

    it("should be able to remove an agent", function() {
      var anotherAgent = {host: 'localhost:2224', name:'007'};

      gossipHandler.addAgent(agent1);
      gossipHandler.addAgent(anotherAgent);

      expect(gossipHandler.getAgentHosts()).to.deep.equal([agent1.host, anotherAgent.host]);
      expect(gossipHandler.getAgent(agent1.host)).to.deep.equal(agent1);
      expect(gossipHandler.getAgent(anotherAgent.host)).to.deep.equal(anotherAgent);

      gossipHandler.removeAgent(agent1.host);
      expect(gossipHandler.getAgentHosts()).to.deep.equal([anotherAgent.host]);

      gossipHandler.removeAgent(anotherAgent.host);
      expect(gossipHandler.getAgentHosts()).is.empty;
    });
  });
});