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

var fixture = require('salinity');
var expect = fixture.expect;

var path = require('path');
var shell = require('shelljs');

var AgentActions = require("../../lib/agent/AgentActions.js");

describe("AgentActions.js", function(){
  var actions = new AgentActions(
    { }, 
    { deployDir: path.join(shell.tempdir(), "interpolate") }, 
    {"billy": "bob", "sally": "sue"}
  );

  describe("interpolateFile()", function(){
    var actions = new AgentActions(
      { }, 
      { deployDir: path.join(shell.tempdir(), "interpolate") }, 
      {"billy": "bob", "sally": "sue"}
    );

    it("passes a sanity check", function(done){
      var outFile = path.join(shell.tempdir(), 'interpolateConfig');
      shell.rm(outFile);

      JSON.stringify({host: "#{billy}", brother: "man", sister: "#{sally}"}).to(outFile);
      actions.interpolateFile(outFile, actions.buildInterpolationValues({}), function(err){
        var contents = JSON.parse(shell.cat(outFile));
        expect(contents).deep.equals({host: "bob", brother: "man", sister: "sue"});
        shell.rm(outFile);
        done(err);
      });
    });

    it("replaces all instances, even if it occurs more than once", function(done){
      var outFile = path.join(shell.tempdir(), 'interpolateConfig');
      shell.rm(outFile);

      JSON.stringify({host: "#{billy}", brother: "man", sister: "#{billy}"}).to(outFile);
      actions.interpolateFile(outFile, actions.buildInterpolationValues({}), function(err){
        var contents = JSON.parse(shell.cat(outFile));
        expect(contents).deep.equals({host: "bob", brother: "man", sister: "bob"});
        shell.rm(outFile);
        done(err);
      });
    });

  });

  describe("interpolateValues()", function(){

    it("works", function(done){
      var outDir = path.join(shell.tempdir(), 'interpolateValues');
      shell.rm('-rf', outDir);
      shell.mkdir(outDir);

      var output = {host: "#{billy}", brother: "man", sister: "#{sally}"};
      var interpolated = {host: "bob", brother: "man", sister: "sue"};

      JSON.stringify(output).to(path.join(outDir, "changeMe.txt"));
      JSON.stringify(output).to(path.join(outDir, "noChange.txt"));
      JSON.stringify(output, null, 2).to(path.join(outDir, "changeMePretty.txt"));
      JSON.stringify(["changeMe.txt", "changeMePretty.txt"]).to(path.join(outDir, "_interpolation.files"));
      actions.interpolateValues(outDir, actions.buildInterpolationValues({}), function(err){
        expect(JSON.parse(shell.cat(path.join(outDir, "changeMe.txt")))).deep.equals(interpolated);
        expect(JSON.parse(shell.cat(path.join(outDir, "noChange.txt")))).deep.equals(output);
        expect(JSON.parse(shell.cat(path.join(outDir, "changeMePretty.txt")))).deep.equals(interpolated);
        shell.rm('-rf', outDir);
        done(err);
      });
    });

    it("reports error when the interpolation file is written wrong", function(done){
      var outDir = path.join(shell.tempdir(), 'interpolateValuesWrongFile');
      shell.rm('-rf', outDir);
      shell.mkdir(outDir);

      var output = {host: "#{billy}", brother: "man", sister: "#{sally}"};
      var interpolated = {host: "bob", brother: "man", sister: "sue"};

      "changeMe.txt\nchangeMePretty.txt".to(path.join(outDir, "_interpolation.files"));
      actions.interpolateValues(outDir, actions.buildInterpolationValues({}), function(err){
        expect(err).to.exist;
        shell.rm('-rf', outDir);
        done();
      });
    });

    it ("completes if no interpolation files", function(done){
      var outDir = path.join(shell.tempdir(), 'interpolateValuesNoFiles');
      shell.rm('-rf', outDir);
      shell.mkdir(outDir);
      actions.interpolateValues(outDir, actions.buildInterpolationValues({}), function(err){
        shell.rm('-rf', outDir);
        done(err);
      });
    });

  });
});