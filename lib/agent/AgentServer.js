var ActionHandler = require('../common/ActionHandler.js');
var AgentActions = require('./AgentActions.js');

module.exports = function(serverFactory, s3, config) 
{  
  var server = serverFactory.makeServer('Shio-Agent', config);

  server.withRestifyServer(function(restify){

    var actions = new AgentActions(s3, config);
    new ActionHandler(actions).register("/slots/:slot", restify);
    
    restify.get('/slots', function(req, res, next){
      res.json(actions.getSlots());
      return next();
    });
  });

  return {
    start: server.start
  };
};