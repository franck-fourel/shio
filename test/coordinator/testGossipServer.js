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

var sinon = fixture.sinon;
var expect = fixture.expect;
var supertest = require('supertest');
var mockableObject = fixture.mockableObject;

var config = {port: 23000};

describe("GossipServer.js", function(){
  var serverFactory = require('../../lib/common/serverFactory.js');
  
  var coordinatorGossip = mockableObject.make("addCoordinator", "getCoordinators");
  var agentGossip = mockableObject.make(
    "addAgent", "agentHeartbeat", "getAgent", "getAgentHosts"
  );

  var api;

  before(function(){
    var gossipServer = require('../../lib/coordinator/gossipServer.js')(
      serverFactory, coordinatorGossip, agentGossip, config
    );
    gossipServer.start();

    api = supertest('http://localhost:' + config.port);
  });

  beforeEach(function() {
    mockableObject.reset(coordinatorGossip, agentGossip);
  });

  describe("v1", function(){
    before(function(){
      api = supertest('http://localhost:' + config.port + '/v1');
    });

    it("returns result of gossipHandler.getCoordinators() on GET to /coordinator", function(done){
      var retVal = [{ howdy: "billy" }];
      sinon.stub(coordinatorGossip, 'getCoordinators').returns(retVal);

      api.get("/coordinator")
         .expect('Content-Type', 'application/json')
         .expect(200, retVal, done);
    });

    it("adds a new coordinator on POST to /coordinator", function(done){
      sinon.stub(coordinatorGossip, 'addCoordinator');
      var coordinator = { host: 'you', number: 1 };

      api.post("/coordinator")
         .set('Content-Type', 'application/json')
         .send(coordinator)
         .expect(201, function(err){
            expect(coordinatorGossip.addCoordinator).have.been.calledOnce;
            expect(coordinatorGossip.addCoordinator).have.been.calledWith(coordinator);
            done();
         });
    });

    it("returns result of gossipHandler.getAgentHosts() on GET to /agent", function(done){
      var retVal = ["billy"];
      sinon.stub(agentGossip, 'getAgentHosts').returns(retVal);

      api.get('/agent')
         .expect('Content-Type', 'application/json')
         .expect(200, retVal, done);
    });

    it("adds a new agent on POST to /agent", function(done){
      sinon.stub(agentGossip, 'addAgent');
      var agent = {host: "billy", payload:"yay"};

      api.post('/agent')
         .set('Content-Type', 'application/json')
         .send(agent)
         .expect(201, function(err){
            expect(agentGossip.addAgent).have.been.calledOnce;
            expect(agentGossip.addAgent).have.been.calledWith(agent);
            done();
         });
    });

    it("calls heartbeat on POST to /agent?heartbeat=true", function(done){
      sinon.stub(agentGossip, 'agentHeartbeat');
      var agent = {host: "billy", payload:"yay"};

      api.post('/agent')
         .set('Content-Type', 'application/json')
         .query({heartbeat: true})
         .send(agent)
         .expect(201, function(err){
            expect(agentGossip.agentHeartbeat).have.been.calledOnce;
            expect(agentGossip.agentHeartbeat).have.been.calledWith(agent);
            done();
         });
    });

    it("returns result of gossipHandler.getAgent() on GET to /agent/:host", function(done){
      var retVal = {host:"billy", payload: "yay"};
      sinon.stub(agentGossip, 'getAgent').withArgs('billy').returns(retVal);

      api.get('/agent/billy')
         .expect('Content-Type', 'application/json')
         .expect(200, retVal, done);
    });

    it("returns 404 when gossipHandler.getAgent() returns null on GET to /agent/:host", function(done){
      sinon.stub(agentGossip, 'getAgent').withArgs('billy').returns(null);

      api.get('/agent/billy')
         .expect(404, done);
    });
  });
});