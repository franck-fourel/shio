var ActionHandler = require('./ActionHandler.js');
var SlotActions = require('./coordinator/SlotActions.js');
var ServerActions = require('./coordinator/ServerActions.js');

module.exports = function(serverFactory, sitter, config) 
{  
  var server = serverFactory.makeServer('Shio-Coordinator', config);

  server.withRestifyServer(function(restify){
    new ActionHandler(new SlotActions(sitter)).register('/slots', restify);
    new ActionHandler(new ServerActions(sitter)).register('/servers', restify);
  });

  return {
    start: server.start
  };
};