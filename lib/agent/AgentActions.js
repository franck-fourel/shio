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
var fs = require('fs');
var path = require('path');
var child_process = require('child_process');

var _ = require('lodash');
var pre = require('amoeba').pre;
var async = require('async');
var shell = require('shelljs');


var fn = require('../fn.js');
var log = require('../log.js')('AgentActions.js');

var EMPTY_BUNDLE = { binary: { name: '_empty', version: '_empty'},  config: { name: '_empty', version: '_empty'} };

function AgentActions(s3, config, interpolationValues, buckets) {
  this.s3 = pre.notNull(s3, 's3 cannot be null');
  this.config = pre.notNull(config, 'config cannot be null');
  this.interpolationValues = pre.notNull(interpolationValues, 'interpolationValues cannot be null');
  this.buckets = pre.notNull(buckets, 'buckets cannot be null')
  this.slots = {};

  log.info(
    'AgentActions created with config[%j], interpolationValues[%j]',
    this.config,
    this.interpolationValues
  );

  this.bootstrap();
}

AgentActions.prototype.bootstrap = function()
{
  var self = this;
  var deployDir = pre.notNull(
    this.config.deployDir, 'config.deployDir cannot be null, config[%j]', this.config
  );

  shell.mkdir('-p', deployDir);

  var ids = shell.ls(deployDir);

  // Convert from old directory structure to new one.
  // We used to just use config.deployDir/slot/numerical_deploy_dir
  // We now use config.deployDir/slot/deploy/numerical_deploy_dir
  ids.forEach(function(slot){
    var slotDir = self.slotBase(slot);
    var deployDir = self.deployBase(slot);
    if ( fs.existsSync(slotDir) && !fs.existsSync(deployDir) && !fs.existsSync(self.persistBase)) {
      log.info('Moving directories from [%s] to [%s]', slotDir, deployDir);
      shell.mkdir(deployDir);
      shell.mv(path.join(slotDir, '*'), deployDir);
    }
  });

  ids.forEach(this.addListing.bind(this));
  for (var slot in this.slots) {
    if (this.slots[slot].state === 'RUNNING') {
      var internal = this.slots[slot]._internal;
      this.watchPid(slot, internal.pid, internal.pidFile);
    }
  }
};

AgentActions.prototype.createSlot = function(params, bundle, res, cb) {
  var slot = params.slot;

  var deployDir = this.deployBase(slot);
  if (fs.existsSync(deployDir)) {
    return cb();
  }

  log.info('Creating slot[%s] with deployDir[%s]', slot, deployDir);
  shell.mkdir('-p', path.join(deployDir, '0'));
  fs.writeFileSync(this.bundleFile(slot, 0), JSON.stringify(EMPTY_BUNDLE));
  this.addListing(slot);
  return cb();
};

AgentActions.prototype.deleteSlot = function(params, bundle, res, cb) {
  var slot = params.slot;

  if (this.slots[slot] != null && this.slots[slot].state == 'RUNNING') {
    return cb('Cannot delete slot with a running process, call stop first.');
  }

  var slotDir = this.slotBase(slot);
  if (fs.existsSync(slotDir)) {
    log.info('Deleting slot[%s], removing directory[%s]', slot, slotDir);
    shell.rm('-r', slotDir);
    delete this.slots[slot];
  }
  else {
    log.info('Asked to delete slot[%s], but dir[%s] wasn\'t there.', slot, slotDir);
  }

  return cb();
};

AgentActions.prototype.load = function(params, bundle, res, cb) {
  var self = this;
  var slot = params.slot;

  log.info('Loading [%j]', bundle);

  var deployCount = this.currDeployCount(slot);
  if (this.isRunning(slot, deployCount)) {
    return cb('Currently running, please stop first.');
  }

  var binaryFilename = util.format('%s-%s.tar.gz', bundle.binary.name, bundle.binary.version);
  var configFilename = util.format('config-%s.tar.gz', bundle.config.version);

  var binaryKeyPath = util.format('deploy/%s', bundle.binary.name);
  var configKeyPath = util.format('config/%s/%s', bundle.binary.name, bundle.config.name);

  var nextDeployCount = deployCount + 1;
  var outDir = this.deployDir(slot, nextDeployCount);

  var binOutDir = path.join(outDir, path.basename(binaryFilename, '.tar.gz'));
  var interpolationVals = this.buildInterpolationValues({
    persistentStorage : this.persistBase(slot)
  });
  async.series(
    [
      this.loadFile.bind(this, this.buckets.binaries, binaryKeyPath , slot, binaryFilename),
      this.loadFile.bind(this, this.buckets.config, configKeyPath, slot, configFilename),
      fn.asyncify(shell.mkdir.bind(shell, '-p', outDir)),
      this.expandTar.bind(this, this.tmpFile(slot, binaryFilename), outDir),
      this.expandTar.bind(this, this.tmpFile(slot, configFilename), binOutDir),
      this.interpolateValues.bind(this, binOutDir, interpolationVals),
      fs.writeFile.bind(fs, this.bundleFile(slot, nextDeployCount), JSON.stringify(bundle, null, 2)),
      fn.asyncify(self.addListing.bind(self, slot))
    ],
    function(err, results) {
      var storageDir = self.tmpDir(slot);
      log.info('Removing temporary directory[%s]', storageDir);
      shell.rm('-r', storageDir);

      if (err) {
        return cb(err);
      }
      res.send(200);
      return cb();
    }
  );
};

AgentActions.prototype.unload = function(params, bundle, res, cb) {
  var slot = params.slot;

  if (this.slots[slot] == null) {
    return cb();
  }

  if (this.slots[slot].state == 'RUNNING') {
    return cb('Cannot unload running process, call stop first.');
  }

  log.info('Unloading deploy at slot[%s]', slot);

  var deployCount = this.currDeployCount(slot) + 1;
  var deployDir = this.deployDir(slot, deployCount);
  shell.mkdir('-p', deployDir);
  fs.writeFileSync(this.bundleFile(slot, deployCount), JSON.stringify(EMPTY_BUNDLE));
  this.addListing(slot);
  return cb();
};

AgentActions.prototype.start = function(params, bundle, res, cb) {
  var slot = params.slot;
  var deployCount = this.currDeployCount(slot);

  if (deployCount === 0) {
    return cb(util.format('slot[%s] is not deployed.', slot));
  }

  var deployDir = this.deployDir(slot, deployCount);

  var bundleContents = JSON.parse(fs.readFileSync(this.bundleFile(slot, deployCount)));

  if (this.isRunning(slot, deployCount)) {
    return cb('Already running');
  }

  var workingDir = path.join(deployDir, util.format('%s-%s', bundleContents.binary.name, bundleContents.binary.version));
  var startScript = path.join(workingDir, 'start.sh');

  if (! fs.existsSync(startScript)) {
    return cb('No start.sh script, make sure your binary artifact has a start.sh script bundled.');
  }

  log.info('Starting binary[%j], config[%j] -- Running startScript[%s].', bundleContents.binary, bundleContents.config, startScript);

  var out = fs.openSync(path.join(deployDir, 'out.log'), 'a');
  var err = fs.openSync(path.join(deployDir, 'out.log'), 'a');
  var child = child_process.spawn(startScript, [], { cwd: workingDir, detached: true, stdio: [ 'ignore', out, err]});
  child.on('error', function(err) { log.error(err); });

  var runningFile = this.pidFile(slot, deployCount);
  fs.writeFileSync(runningFile, String(child.pid));
  this.watchPid(slot, child.pid, runningFile);

  child.unref();

  this.slots[slot].state = 'RUNNING';
  res.send(200);
  return cb();
};

AgentActions.prototype.stop = function(params, bundle, res, cb) {
  var self = this;
  var slot = params.slot;

  var pidFile = this.pidFile(slot, this.currDeployCount(slot));
  if (! fs.existsSync(pidFile)) {
    log.info('slot[%s], asked to kill process with no pidFile[%s]', slot, pidFile);
    res.send(200);
    return cb();
  }


  var pid = String(fs.readFileSync(pidFile));
  if (! this.processRunning(pid)) {
    log.info('slot[%s], asked to kill process[%s] that wasn\'t running', slot, pid);
    res.send(200);
    return cb();
  }

  log.info('slot[%s], killing pid[%s].', slot, pid);

  child_process.exec(util.format('kill %s', pid), function(err, stdout, stderr) {
    if (err != null) {
      log.warn('slot[%s], kill pid[%s] failed with code[%s], out[%s], err[%s]', slot, pid, err.code, stdout, stderr);
      return cb('Failed to kill process.');
    }

    fs.unlinkSync(pidFile);
    self.slots[slot].state = 'STOPPED';
    res.send(200);
    return cb();
  });

  setTimeout(
    function(){
      if (self.processRunning(pid)) {
        log.error('slot[%s], pid[%s] still running after kill.  Being a little more persuasive.', slot, pid);
        child_process.exec(util.format('kill -9 %s', pid), function(err, stdout, stderr) {
          if (err != null) {
            log.error('kill -9 pid[%s] failed with code[%s], out[%s], err[%s]', pid, err.code, stdout, stderr);
          }
        });
      }
    },
    2 * 60 * 1000
  ).unref();
};

AgentActions.prototype.show = function(params, bundle, res, cb) {
  res.json(this.slots);
  return cb();
};

AgentActions.prototype.getSlots = function() {
  return this.slots;
};

AgentActions.prototype.tmpDir = function(slot) {
  return path.join(shell.tempdir(), String(slot));
};

AgentActions.prototype.tmpFile = function(slot, file) {
  return path.join(this.tmpDir(slot), file);
};

AgentActions.prototype.currDeployCount = function(slot) {
  if (typeof slot === 'undefined') {
    throw new Error('must specify slot parameter');
  }

  var deployBase = this.deployBase(slot);
  if (! fs.existsSync(deployBase)) {
    shell.mkdir('-p', deployBase);
  }

  var deploys = shell.ls(deployBase);
  return Math.max.apply(null, [0].concat(deploys.map(Number)));
};

AgentActions.prototype.slotBase = function(slot) {
  return path.join(this.config.deployDir, String(slot));
};

AgentActions.prototype.deployBase = function(slot) {
  return path.join(this.slotBase(slot), 'deploy');
};

AgentActions.prototype.persistBase = function(slot) {
  return path.join(this.slotBase(slot), 'persistent');
};

AgentActions.prototype.deployDir = function(slot, deployCount) {
  return path.join(this.deployBase(slot), String(deployCount));
};

AgentActions.prototype.bundleFile = function(slot, deployCount) {
  return path.join(this.deployDir(slot, deployCount), 'deployed-bundle.json');
};

AgentActions.prototype.pidFile = function(slot, deployCount) {
  return path.join(this.deployDir(slot, deployCount), 'running.pid');
};

AgentActions.prototype.loadFile = function(bucket, keyBase, slot, file, cb) {
  var filename = this.tmpFile(slot, file);
  if (fs.existsSync(filename)) {
    log.info('File[%s] exists, deleting.', filename);
    shell.rm(filename);
  }

  var tmpPath = path.dirname(filename);
  if (! fs.existsSync(tmpPath)) {
    log.info('Making dir[%s].', tmpPath);
    shell.mkdir('-p', tmpPath);
  }

  var error = null;
  var outStream = fs.createWriteStream(filename);
  outStream.on('finish', function() { cb(error); });
  var done = false;
  var s3GetObject = { Bucket: bucket, Key: keyBase + '/' + file };
  log.info('Downloading [%j] to [%s]', s3GetObject, filename);
  this.s3.getObject(s3GetObject)
    .on('httpData', function(chunk) { outStream.write(chunk); })
    .on('httpDone', function() { if (!done) { done = true; outStream.end(); } })
    .on('error', function(err) {
      if (!done) {
        done = true;
        error = err;
        error.message = util.format('%s: %j', error.message, s3GetObject);
        outStream.end();
      }
    })
    .send();
};

AgentActions.prototype.buildInterpolationValues = function(extensions)
{
  return _.extend(_.cloneDeep(this.interpolationValues), extensions);
};

AgentActions.prototype.interpolateValues = function(baseDir, vals, cb)
{
  var self = this;
  var filesFile = path.join(baseDir, '_interpolation.files');

  if (fs.existsSync(filesFile)) {
    fs.readFile(filesFile, function(err, data) {
      var files;
      if (err == null) {
        try {
          files = JSON.parse(data);
        }
        catch (e) {
          log.info(e, 'Problem parsing file[%s] as JSON', filesFile);
          return cb({ message: 'Unable to parse the interpolation file.'});
        }

        async.series(
          files.map(function(file) {
            return self.interpolateFile.bind(self, path.join(baseDir, file), vals);
          }),
          cb
        );
      }
      else {
        return cb(err);
      }
    });
  }
  else {
    log.info('No interpolation file found[%s].', filesFile);
    return cb();
  }
};

AgentActions.prototype.interpolateFile = function(file, vals, cb)
{
  if (fs.existsSync(file)) {
    log.info('Interpolating file[%s]', file);
    for (var val in vals) {
      shell.sed('-i', new RegExp(util.format('#{%s}', val), 'g'), vals[val], file);
    }
    return cb();
  }
  else {
    log.info('Asked to interpolate file[%s], but it doesn\'t exist.', file);
    return cb();
  }
};

AgentActions.prototype.expandTar = function(tarFile, outDir, cb) {
  log.info('Expanding [%s] to [%s]', tarFile, outDir);
  child_process.exec(util.format('tar xzf %s', tarFile), {cwd: outDir}, function(err, stdout, stdin) {
    if (err != null) {
      log.error(err, 'Unable to untar[%s]:', tarFile, err.message);
    }
    return cb(err);
  });
};

AgentActions.prototype.isRunning = function(slot, deployCount) {
  var runningFile = this.pidFile(slot, deployCount);
  if (fs.existsSync(runningFile)) {
    if (! this.cleanPid(slot, String(fs.readFileSync(runningFile)), runningFile)) {
      return true;
    }
  }
  return false;
};

AgentActions.prototype.processRunning = function(pid) {
  return fs.existsSync(path.join('/proc', String(pid)));
};

AgentActions.prototype.cleanPid = function(slot, pid, pidFile) {
  if ( (!this.processRunning(pid)) && String(fs.readFileSync(pidFile)) === String(pid)) {
    log.warn('Process[%s] with pid[%s] disdappeared, removing pid file[%s]...', slot, pid, pidFile);
    fs.unlinkSync(pidFile);

    if (this.pidFile(slot, this.currDeployCount(slot)) === pidFile) {
      this.slots[slot].state = 'DISDAPPEARED';
      return true;
    }
  }
  return false;
};

AgentActions.prototype.watchPid = function(slot, pid, pidFile) {
  if (fs.existsSync(pidFile)) {
    var restartedFile = path.join(pidFile, '../restarted');
    if (! this.cleanPid(slot, pid, pidFile)) {
      if (fs.existsSync(restartedFile)) {
        fs.unlinkSync(restartedFile);
      }
      return setTimeout(this.watchPid.bind(this, slot, pid, pidFile), 60 * 1000).unref();
    }
    log.info('pid[%s] disappeared!', pid);

    // This is a really poor way of restarting the process.
    // All of these actions should actually be refactored to be a bit more maintainable
    // and not depend on like a response object and stuff like that.
    // https://github.com/tidepool-org/shio/issues/5
    if (! fs.existsSync(restartedFile)) {
      this.start(
        { slot: slot },
        {},
        { send: function() {} },
        function(err) {
          fs.writeFileSync(restartedFile, new Date().toISOString());
          if (err != null) {
            log.warn(err, 'Problem restarting slot[%s]', slot);
          } else {
            log.info('Successfully restarted slot[%s]', slot);
          }
        }
      );
    } else {
      log.info('Restarted file[%s] existed, so no restart!', restartedFile);
    }
  }
};

AgentActions.prototype.addListing = function(slot) {
  var currDeploy = this.currDeployCount(slot);

  var bundleFile = this.bundleFile(slot, currDeploy);
  while (! fs.existsSync(bundleFile)) {
    log.warn('Expected bundleFile[%s] to exist, but it didn\'t.  Deleting.', bundleFile);
    shell.rm('-r', this.deployDir(slot, currDeploy));

    --currDeploy;
    if (currDeploy < 0 || isNaN(currDeploy)) {
      var slotDir = this.slotBase(slot);
      log.error('Unable to find usable deploy.  Deleting slot directory[%s]', slotDir);
      shell.rm('-r', slotDir);
      return;
    }
    bundleFile = this.bundleFile(slot, currDeploy);
  }

  var bundle = JSON.parse(fs.readFileSync(bundleFile));
  var _internal = {};

  var pidFile = this.pidFile(slot, currDeploy);
  if (fs.existsSync(pidFile)) {
    _internal.pidFile = pidFile;
    var pid = fs.readFileSync(pidFile);
    if (this.processRunning(pid)) {
      _internal.pid = pid;
      bundle.state = 'RUNNING';
    }
    else {
      bundle.state = 'STOPPED';
    }
  }
  else {
    bundle.state = 'STOPPED';
  }

  bundle._internal = _internal;
  this.slots[slot] = bundle;
};

module.exports = AgentActions;
