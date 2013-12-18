var fixture = require('../fixture.js');
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

    it("works", function(done){
      var outFile = path.join(shell.tempdir(), 'interpolateConfig');
      JSON.stringify({host: "#{billy}", brother: "man", sister: "#{sally}"}).to(outFile);
      actions.interpolateFile(outFile, actions.buildInterpolationValues({}), function(err){
        var contents = JSON.parse(shell.cat(outFile));
        expect(contents).deep.equals({host: "bob", brother: "man", sister: "sue"});
        shell.rm(outFile);
        done(err);
      });
    });
  });

  describe("interpolateValues()", function(){

    it("works", function(done){
      var outDir = path.join(shell.tempdir(), 'interpolateValues');
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

    it ("completes if no interpolation files", function(done){
      var outDir = path.join(shell.tempdir(), 'interpolateValuesNoFiles');
      shell.mkdir(outDir);
      actions.interpolateValues(outDir, actions.buildInterpolationValues({}), function(err){
        shell.rm('-rf', outDir);
        done(err);
      });
    });

  });
});