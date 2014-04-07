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

var restify = require('restify');

var log = require('../log.js')('ServerFactory.js');

exports.makeServer = function(name, config) 
{
  var server = restify.createServer({
    name: name,
    formatters: {
      "application/json": function prettyJson(req, res, body) {
        if (!body) {
          if (res.getHeader('Content-Length') === undefined &&
              res.contentLength === undefined) {
            res.setHeader('Content-Length', 0);
          }
          return null;
        }

        if (body instanceof Error) {
          // snoop for RestError or HttpError, but don't rely on instanceof
          if ((body.restCode || body.httpCode) && body.body) {
            body = body.body;
          } else {
            body = {
              message: body.message
            };
          }
        }

        if (Buffer.isBuffer(body))
          body = body.toString('base64');

        var data = req.params && req.params.pretty !== undefined ? JSON.stringify(body, null, 2) : JSON.stringify(body);

        if (res.getHeader('Content-Length') === undefined &&
            res.contentLength === undefined) {
          res.setHeader('Content-Length', Buffer.byteLength(data));
        }

        return data;
      }
    }
  });

  // Two standard restify handler plugins:
  server.use(restify.queryParser());
  server.use(restify.bodyParser({ mapParams : false }));

  server.get('/status', function(req, res, next) {
    res.send(200, 'OK');
    return next();
  });

  return {
    withRestifyServer: function(withServerCb) {
      return withServerCb(server);
    },
    start: function () {
      var port = config.port;
      log.info('%s serving on port[%s]', name, port);
      server.listen(port);
      server.on('uncaughtException', function(req, res, route, error){
        if (error.name === 'IllegalArgumentException') {
          log.info(error, 'Returning 400 for an IllegalArgumentException[%s]', error.message);
          res.send(400, error.message);
        }
        else {
          log.warn(
            error, 
            "%s: Uncaught Exception on req[%s] for route[%s %s]: %s", 
            name, req.id(), route.spec.path, route.spec.method, error.message
          );
          res.send(500, util.format("Server Error: %s", req.id()));
        }
      });
    }
  };
}