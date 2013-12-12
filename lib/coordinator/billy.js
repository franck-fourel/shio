module.exports = function (serverFactory, coordinatorGossip, agentGossip, config) 
{  
  var server = serverFactory.makeServer('Gossip', config);

  server.withRestifyServer(function(restify){
    restify.get('/v1/coordinator', function(req, res, next) {
      res.send(200, coordinatorGossip.getCoordinators());
      return next();
    });

    restify.post('/v1/coordinator', function(req, res, next) {
      var coordinator = req.body;
      coordinatorGossip.addCoordinator(coordinator);
      res.send(201);
      return next();
    });

    restify.get('/v1/agent', function(req, res, next) {
      res.send(200, agentGossip.getAgentHosts());
      return next();
    });

    restify.post('/v1/agent', function(req, res, next) {
      var agent = req.body;
      var doHeartbeat = req.params['heartbeat'] != null;

      if (doHeartbeat) {
        agentGossip.agentHeartbeat(agent);
      } 
      else {
        agentGossip.addAgent(agent);
      }
      
      res.send(201);
      return next();
    });

    restify.get('/v1/agent/:agentId', function(req, res, next) {
      var agent = agentGossip.getAgent(req.params.agentId);

      if (agent == null) {
        return res.send(404);
      }      
      res.send(200, agent);
      return next();
    });
  });

  return {
    start: server.start
  };
};