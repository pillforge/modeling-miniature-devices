describe('Main', function () {
  'use strict';

  var testFixture = require('../../globals');
  var rimraf = testFixture.rimraf;
  var Q = testFixture.Q;
  var gmeConfig = testFixture.getGmeConfig();
  var projectName = 'TestProject';
  var logger = testFixture.logger.fork('MainPlugin');
  var gmeAuth, storage, result, core;
  var PluginCliManager = testFixture.WebGME.PluginCliManager;
  var pluginName = 'Main';
  var expect = testFixture.expect;

  before(function (done) {
    testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
      .then(function (gmeAuth_) {
        gmeAuth = gmeAuth_;
        // This uses in memory storage. Use testFixture.getMongoStorage to persist test to database.
        storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
        return storage.openDatabase();
      })
      .then(function () {
        var importParam = {
          projectSeed: 'src/seeds/MainProject/MainProject.webgmex',
          projectName: projectName,
          branchName: 'master',
          logger: logger,
          gmeConfig: gmeConfig
        };
        return testFixture.importProject(storage, importParam);
      })
      .then(function (importResult) {
        result = importResult;
        core = importResult.core;
      })
      .nodeify(done);
  });

  after(function (done) {
    storage.closeDatabase()
      .then(gmeAuth.unload)
      .then(function () {
        return Q.nfcall(rimraf, './test-tmp');
      })
      .nodeify(done);
  });

  describe('Compile a list of Applications and return the source code and binaries', function () {
    [
      'EmptyApplication',
      'Sense',
      'Send',
      'SenseAndSend',
      'TwoRadios',
      'CombineTwoSensors',
      'UseFunction'
    ].forEach(app => {
      testApp(app);
    });
  });

  function testApp (name) {
    it(name, function(done) {
      testFixture.findApplicationNode(core, result.rootNode, name)
        .then(function (node) {
          return runPlugin(core.getPath(node));
        })
        .then(function (plugin_result) {
          expect(typeof plugin_result).to.equal('object');
          expect(plugin_result.success).to.equal(true);
        })
        .catch(function (error) {
          error.should.equal(null);
        })
        .nodeify(done);
    });
  }

  describe('Error handling', function() {
    [ 'MissingTypeWrongType'
    ].forEach(app => {
      testAppFail(app);
    });
  });

  function testAppFail (name) {
    it(name, function(done) {
      testFixture.findApplicationNode(core, result.rootNode, name)
        .then(function (node) {
          return runPlugin(core.getPath(node));
        })
        .then(function (plugin_result) {
          expect(typeof plugin_result).to.equal('object');
          expect(plugin_result.success).to.equal(false);
        })
        .catch(function (error) {
          error.should.not.equal(null);
        })
        .nodeify(done);
    });
  }

  function runPlugin (id) {
    var manager = new PluginCliManager(null, logger, gmeConfig);
    var pluginConfig = {};
    var context = {
      project: result.project,
      branchName: 'master',
      activeNode: id
    };
    return Q.nfcall(manager.executePlugin, pluginName, pluginConfig, context);
  }

});
