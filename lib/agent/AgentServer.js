var ActionHandler = require('../common/ActionHandler.js');

module.exports = function(serverFactory, agentActions, config) 
{  
  var server = serverFactory.makeServer('Shio-Agent', config);

  server.withRestifyServer(function(restify){
    new ActionHandler(agentActions).register("/slots/:slot", restify);
    
    restify.get('/slots', function(req, res, next){
      res.json(agentActions.getSlots());
      return next();
    });
  });

  return {
    start: server.start
  };
};