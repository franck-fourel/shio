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

var util = require('util');

var log = require('../log.js')('gossipHandlerCoordinator.js');

var except = require('amoeba').except;

var getKey = function(elem) {
  var host = elem.host;
  if (host == null) {
    throw except.IAE('Must specify a host property, got[%j]', elem);
  }

  return host;
};

module.exports = function(selfDescription, config, gossipClientFactory, polling) {
  var coordinators = {};

  var coordinatorBlacklist = {};

  var selfKey = getKey(selfDescription);
  coordinators[selfKey] = selfDescription;

  var resyncClient = gossipClientFactory(config);

  var retVal = {
    addCoordinator: function(coordinator) {
      var self = this;

      log.info('Adding coordinator[%j]', coordinator);

      var key = getKey(coordinator);
      if (coordinators[key] != null) {
        log.info('Replacing existing coordinator [%j] with [%j].', coordinators[key], coordinator);
      }
      else {
        var coordinatorClient = gossipClientFactory(coordinator);
        polling.repeat(
          util.format('%s coordinator poll', key),
          function(cb){
            coordinatorClient.getCoordinators(function(err, coords) {
              if (err == null) {
                for (var i = 0; i < coords.length; ++i) {
                  var theirKey = getKey(coords[i]);
                  if (! coordinatorBlacklist[theirKey]) {
                    if (coordinators[theirKey] == null) {
                      self.addCoordinator(coords[i]);
                    }
                  }
                }
                return cb();
              }
              else {
                log.warn('Error talking to coordinator[%s], removing.', coordinatorClient.getHost());
                delete coordinators[key];
                coordinatorBlacklist[key] = true;
                return cb(false);
              }
            });
          },
          config.heartbeatDuration
        );
      }
      coordinators[key] = coordinator;
      coordinatorBlacklist[key] = false;
    },
    getCoordinators: function() {
      return Object.keys(coordinators).map(function(host){
        return coordinators[host];
      });
    }
  };

  polling.repeat(
    'resync',
    function(cb) {
      resyncClient.getCoordinators(function(err, coords){
        if (err == null) {
          var theyKnowAboutMe = false;
          for (var i = 0; i < coords.length; ++i) {
            var key = getKey(coords[i]);
            if (key === selfKey) {
              theyKnowAboutMe = true;
            }
            else if (coordinators[key] == null) {
              retVal.addCoordinator(coords[i]);
            }
          }

          if (! theyKnowAboutMe) {
            resyncClient.addCoordinator(selfDescription, function(err) {
              if (err != null) {
                log.info(err, 'Error adding self to remote coordinator[%s]', resyncClient.getHost());
              }
            });
          }
        }
        else {
          log.error(err, 'Unable to resync from [%s] due to an error.', resyncClient.getHost());
        }
        return cb();
      });
    },
    config.resyncPollDuration || config.heartbeatDuration * 10
  );

  return retVal;
};