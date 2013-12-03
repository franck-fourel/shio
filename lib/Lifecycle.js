function Lifecycle() {
  this.objects = [];
}

Lifecycle.prototype.register = function(obj) {
  this.objects.push(obj);
}

Lifecycle.prototype.close = function() {
  this.objects.forEach(function(obj) {
    if (typeof obj.close === 'function') {
      obj.close();
    }
  });
}

module.exports = Lifecycle;