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
 'use strict';

var qS = require('querystring');
var util = require('util');
var readline = require('readline');

var async = require('async');
var Command = require('commander').Command;
var restify = require('restify');

var fn = require('../fn.js');
var Lifecycle = require('../Lifecycle.js');
var Formatter = require('./Formatter.js');

var splitter = function(str) {
  return str.split(',');
};

function ActAndListCli(config) {
  this.config = config;
  this.program = new Command();
  this.client = null;
  this.lifecycle = new Lifecycle();
}

ActAndListCli.prototype.doAction = function(payload, cb) {
  var queryObject = {};

  var fields = this.config.fields;
  for (var i = 0; i < fields.length; ++i) {
    var field = fields[i].name;
    if (this.program[field] != null) {
       queryObject[field] = this.program[field];
     }
  }

  if (this.client == null) {
    var host = this.program.coordinatorHost || process.env.SHIO_COORDINATOR_HOST || '0.0.0.0';
    var port = this.program.coordinatorPort || process.env.SHIO_COORDINATOR_PORT || 17000;

    var jsonClient = restify.createJsonClient(
      { url: util.format('http://%s:%s', host, port), retry: { retries: 0 } }
    );
    this.lifecycle.register(jsonClient);

    this.client = jsonClient;
  }

  var path = util.format('%s?%s', this.config.endpoint, qS.stringify(queryObject));
  this.client.post(path, payload, function(err, req, res, result) {
    return cb(err, result);
  });
};

ActAndListCli.prototype.showAction = function(cb) {
  return this.doAction({type: 'show'}, cb);
};

ActAndListCli.prototype.showFn = function(cb) {
  var self = this;

  return this.showAction(function(err, results) {
    if (err != null) {
      if (cb != null) {
        return cb(err);
      }
      console.log('Error showing results:', err.message);
      return console.log(err.stack);
    }

    if (results.length === 0) {
      console.log('No results match your query');
      return cb();
    }

    self._displayResults(results);
    if (cb != null) {
      return cb();
    }
  });
};

ActAndListCli.prototype._displayResults = function(results) {
  var fields = this.program.fields;
  if (fields == null) {
    fields = this.config.defaultFields;
  }

  if (fields != null && fields.length === 1 && fields[0] === '_all') {
    fields = null;
  }

  if (fields == null) {
    fields = this.config.fields.map(fn.accessor('name'));
  }

  var formatter = Formatter.analyzeObjects(results, fields);

  if (! this.program.noHeader) {
    formatter.logHeader();
  }
  results.forEach(formatter.log.bind(formatter));
};

ActAndListCli.prototype.doActionAndShow = function(payload) {
  var self = this;

  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  this.lifecycle.register(rl);

  return async.waterfall(
    [ this.showAction.bind(this),
      function(results, cb) {
        if (results.length === 0) {
          return cb('Nothing matches'); // Short-circuit
        }

        console.log('This command will affect:');
        self._displayResults(results);
        if (self.program.yes) {
          return cb(null, 'yes');
        } else {
          rl.question('Is this ok? (yes/no) ', function(answer) {
            return cb(null, answer);
          });
        }
      },
      function(answer, cb) {
        if ('yes' === answer) {
          return self.doAction(payload, cb);
        }
        return cb({ message: 'Abort, abort!' });
      },
      function(results, cb) {
        self.showFn(cb);
      }
    ],
    function(err) {
      if (err != null) {
        console.log('Error doing action[%j]!', payload, err.message);
        if (self.program.verbose) {
          console.log(err.stack);
        }
      }
      self.lifecycle.close();
    }
  );
};

ActAndListCli.prototype.build = function(commandFn) {
  this.program
    .version('0.1.0')
    .option('--coordinatorHost', 'specify the coordinator host.  Overrides SHIO_COORDINATOR_HOST env variable, defaults to 0.0.0.0')
    .option('--coordinatorPort', 'specify the coordinator port.  Overrides SHIO_COORDINATOR_PORT, defaults to 17000')
    .option('-v, --verbose', 'verbose output')
    .option('-t, --yes', 'I know what I\'m doing, don\'t prompt me.')
    .option('--noHeader', 'Don\'t show header line', false)
    .option('--fields [fields]', 'Select fields to show', splitter);

  var fields = this.config.fields;
  for (var i = 0; i < fields.length; ++i) {
    var field = fields[i];

    var flags = '';
    if (field.flag != null) {
      flags += field.flag + ', ';
    }
    flags += util.format('--%s <%s>', field.name, field.name);

    this.program.option(flags, util.format('filter for a specific %s', field.name));
  }

  var self = this;

  this.program
    .command('show')
    .description('shows all running processes')
    .action(this.showFn.bind(this, function(){self.lifecycle.close();}));

  commandFn(this, this.program);

  return this;
};

ActAndListCli.prototype.run = function(argv) {
  if (argv == null) {
    argv = process.argv;
  }

  this.program.parse(argv);

  if (! this.program.args.length) {
    this.program.help();
  }
};

module.exports = ActAndListCli;