
var fs = require('fs');
var util = require('util');

var ifExists = function(path) {
  return fs.exists(path) ? path : null;
};

var typeMismatchError = function(property, base, toOverlay)
{
  return new Error(util.format(
    "Property[%s].  Miss-matched types: lhs[%s], rhs[%s]", property, typeof(base[property]), typeof(toOverlay[property])
  ));

}

var overlayObject = function(base, toOverlay) {
  var retVal = {};
  for (var property in base) {
    if (toOverlay[property] != null) {
      if (typeof(base[property]) === 'object') {
        if (typeof(toOverlay[property]) === 'object') {
          retVal[property] = overlayObject(base[property], toOverlay[property]);
        }
        else {
          throw typeMismatchError(property, base, toOverlay);
        }
      }
      else {
        if (typeof(base[property]) !== typeof(toOverlay[property])) {
          throw typeMismatchError(property, base, toOverlay);
        }
        retVal[property] = toOverlay[property];
      }
    } else {
      retVal[property] = base[property];
    }
  }

  for (var property in toOverlay) {
    if (retVal[property] == null) {
      retVal[property] = toOverlay[property];
    }
  }

  return retVal;
}

exports.loadConfig = function(file) {
  var config = require('../conf/default_config.json');

  if (fs.existsSync(file)) {
    config = overlayObject(config, JSON.parse(fs.readFileSync(file)));
  }

  if (process.env.CONFIGFILE !== undefined) {
    config = overlayObject(config, require(process.env.CONFIGFILE));
  }
  return config;
}