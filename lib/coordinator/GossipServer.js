function makeGossipServer(serverFactory, gossipHandler, config) 
{  
  var server = serverFactory.makeServer('Gossip', config);

  server.withRestifyServer(function(restify){
    restify.get('/v1/coordinator', function(req, res, next) {
      res.send(200, gossipHandler.getCoordinators());
    });

    restify.post('/v1/coordinator', function(req, res, next) {
      var coordinator = req.body;
      gossipHandler.addCoordinator(coordinator);
      res.send(201);
    });

    restify.get('/v1/agent', function(req, res, next) {
      res.send(200, gossipHandler.getAgentHosts());
    });

    restify.post('/v1/agent', function(req, res, next) {
      var agent = req.body;
      gossipHandler.addAgent(agent);
      res.send(201);
    });

    restify.get('/v1/agent/:agentId', function(req, res, next) {
      var agent = gossipHandler.getAgent(req.params.agentId);

      if (agent == null) {
        return res.send(404);
      }      
      res.send(200, agent);
    });
  });

  return {
    start: server.start
  };
}

module.exports = makeGossipServer;