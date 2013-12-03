var util = require('util');

var delegateCb = function(cb) {
  return function(err, req, res, result) {
    return cb(err, result);
  };
}

function CoordinatorClient(jsonHttpClient) {
  this.jsonHttpClient = jsonHttpClient;
}

CoordinatorClient.prototype.assign = function(name, id, binary, config, cb) {
  this.actOnServer(name, id, { type : 'assign', binary: binary, config: config}, cb);
}

CoordinatorClient.prototype.unassign = function(name, id, cb) {
  this.actOnServer(name, id, { type : 'unassign' }, cb);
}

CoordinatorClient.prototype.start = function(name, id, cb) {
  this.actOnServer(name, id, { type : 'start'}, cb);
}

CoordinatorClient.prototype.stop = function(name, id, cb) {
  this.actOnServer(name, id, { type : 'stop'}, cb);
}

CoordinatorClient.prototype.actOnServer = function(name, id, payload, cb) {
  this.jsonHttpClient.post(util.format('/servers/%s/%s', name, id), payload, delegateCb(cb));
}

CoordinatorClient.prototype.listings = function(cb) {
  this.jsonHttpClient.get('/listings', delegateCb(cb));
}

CoordinatorClient.prototype.servers = function(cb) {
  this.jsonHttpClient.get('/servers', delegateCb(cb));
}

module.exports = CoordinatorClient;