/*
 * == BSD2 LICENSE ==
 * Copyright (c) 2014, Tidepool Project
 * 
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the associated License, which is identical to the BSD 2-Clause
 * License as published by the Open Source Initiative at opensource.org.
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the License for more details.
 * 
 * You should have received a copy of the License along with this program; if
 * not, you can obtain one from Tidepool Project at tidepool.org.
 * == BSD2 LICENSE ==
 */

var util = require('util');
var sprintf = require('sprintf-js').sprintf;

function Formatter(config) {
  this.formatString = '';
  this.config = config;
  for (var field in config) {
    this.formatString += '%' + util.format('(%s)-%ss', field, config[field].maxLength + 3);
  }
}

Formatter.prototype.logHeader = function() {
  var obj = {};
  for (field in this.config) {
    obj[field] = field;
  }
  this.log(obj);
}

Formatter.prototype.log = function(obj) {
  console.log(sprintf(this.formatString, obj));
}

var lengthMappers = {
  string: function(val) {
    return val.length;
  },

  object: function(val) {
    return util.inspect(val).length;
  }
}

var defaultLengthMapper = function(val) { return String(val).length };

exports.analyzeObjects = function(objs, fields) {
  if (objs.length < 1 && fields == null) {
    return new Formatter({});
  }

  if (fields == null) {
    fields = [];
    for (var field in objs[0]) {
      fields.push(field);
    }
    fields.sort();
  }

  var config = fields.reduce(function(config, field) {
    var length = field.length;
    for (var i = 0; i < objs.length; ++i) {
      var obj = objs[i];
      var val = obj[field];

      var lengthMapper = lengthMappers[typeof val] || defaultLengthMapper;
      length = Math.max(length, lengthMapper(val));
    }

    config[field] = { maxLength: length };
    return config;
  }, {});

  return new Formatter(config);
}