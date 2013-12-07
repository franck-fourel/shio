var fixture = require('./fixture.js');

var sinon = fixture.sinon;
var expect = fixture.expect;
var supertest = fixture.supertest;
var mockableObject = fixture.mockableObject;

var config = {port: 23000};

describe("GossipServer.js", function(){
  var serverFactory = require('../lib/common/serverFactory.js');
  
  var gossipHandlerApi = mockableObject.make(
    "addCoordinator", "getCoordinators", "addAgent", "getAgent", "getAgentHosts"
  );

  var api

  before(function(){
    var gossipServer = require('../lib/coordinator/gossipServer.js')(serverFactory, gossipHandlerApi, config);
    gossipServer.start();

    api = supertest('http://localhost:' + config.port);
  });

  beforeEach(function() {
    mockableObject.reset(gossipHandlerApi);
  });

  describe("v1", function(){
    before(function(){
      api = supertest('http://localhost:' + config.port + '/v1');
    });

    it("returns result of gossipHandler.getCoordinators() on GET to /coordinator", function(done){
      var retVal = [{ howdy: "billy" }];
      sinon.stub(gossipHandlerApi, 'getCoordinators').returns(retVal);

      api.get("/coordinator")
         .expect('Content-Type', 'application/json')
         .expect(200, retVal, done);
    });

    it("adds a new coordinator on POST to /coordinator", function(done){
      sinon.stub(gossipHandlerApi, 'addCoordinator');
      var coordinator = { host: 'you', number: 1 };

      api.post("/coordinator")
         .set('Content-Type', 'application/json')
         .send(coordinator)
         .expect(201, function(err){
            expect(gossipHandlerApi.addCoordinator).have.been.calledOnce;
            expect(gossipHandlerApi.addCoordinator).have.been.calledWith(coordinator);
            done();
         });
    });

    it("returns result of gossipHandler.getAgentHosts() on GET to /agent", function(done){
      var retVal = ["billy"];
      sinon.stub(gossipHandlerApi, 'getAgentHosts').returns(retVal);

      api.get('/agent')
         .expect('Content-Type', 'application/json')
         .expect(200, retVal, done);
    });

    it("adds a new agent on POST to /agent", function(done){
      sinon.stub(gossipHandlerApi, 'addAgent');
      var agent = {host: "billy", payload:"yay"};

      api.post('/agent')
         .set('Content-Type', 'application/json')
         .send(agent)
         .expect(201, function(err){
            expect(gossipHandlerApi.addAgent).have.been.calledOnce;
            expect(gossipHandlerApi.addAgent).have.been.calledWith(agent);
            done();
         });
    });

    it("returns result of gossipHandler.getAgent() on GET to /agent/:host", function(done){
      var retVal = {host:"billy", payload: "yay"};
      sinon.stub(gossipHandlerApi, 'getAgent').withArgs('billy').returns(retVal);

      api.get('/agent/billy')
         .expect('Content-Type', 'application/json')
         .expect(200, retVal, done);
    });

    it("returns 404 when gossipHandler.getAgent() returns null on GET to /agent/:host", function(done){
      sinon.stub(gossipHandlerApi, 'getAgent').withArgs('billy').returns(null);

      api.get('/agent/billy')
         .expect(404, done);
    });
  });
});