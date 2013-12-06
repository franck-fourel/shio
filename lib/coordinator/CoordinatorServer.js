function makeCoordinatorServer(serverFactory, sitter, config) 
{  
  var server = serverFactory.makeServer('Shio-Coordinator', config);

  server.withRestifyServer(function(restify){
    new ActionHandler(new SlotActions(sitter)).register('/slots', restify);
    new ActionHandler(new ServerActions(sitter)).register('/servers', restify);
  });

  return {
    start: server.start
  };
}

module.exports = makeCoordinatorServer;