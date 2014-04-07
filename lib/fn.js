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

exports.asyncify = function(fn) {
  return function() { 
    var cb = arguments[arguments.length - 1];
    process.nextTick(function() {
      fn.apply(null, Array.prototype.splice.call(arguments, 0, arguments.length - 1));
      if (typeof cb === 'function') {
        return cb();
      }
    });
  }
};

exports.compose = function(lhs, rhs) {
  return function(obj) {
    return lhs(rhs(obj));
  }
};

exports.accessor = function(key) {
  return function(obj) {
    return obj[key];
  }
};

exports.equals = function(val) {
  return function(obj) {
    return val === obj;
  }
};
