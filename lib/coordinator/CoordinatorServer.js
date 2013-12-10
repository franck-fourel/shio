var ActionHandler = require('../common/ActionHandler.js');
var SlotActions = require('./SlotActions.js');
var ServerActions = require('./ServerActions.js');

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