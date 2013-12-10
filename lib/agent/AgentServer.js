var ActionHandler = require('../common/ActionHandler.js');
var SlotActions = require('./AgentActions.js');

module.exports = function(s3, config) 
{  
  var server = serverFactory.makeServer('Shio-Coordinator', config);

  server.withRestifyServer(function(restify){
    var actions = new AgentActions(s3, config);
    new ActionHandler(actions).register("/slots/:slot", server);
    restify.get('/slots', function(req, res, next){
      res.json(actions.getSlots());
      return next();
    });
  });

  return {
    start: server.start
  };
};