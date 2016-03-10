var testFixture = require('../../globals');
describe('Main', function () {
  'use strict';

  var gmeConfig = testFixture.getGmeConfig(),
    expect = testFixture.expect,
    logger = testFixture.logger.fork('MainPlugin'),
    PluginCliManager = testFixture.WebGME.PluginCliManager,
    projectName = 'testProject',
    pluginName = 'Main',
    project,
    gmeAuth,
    storage;

  var Q = testFixture.Q;
  var rimraf = testFixture.rimraf;

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
          projectSeed: 'src/seeds/MainProject/MainProject.zip',
          projectName: projectName,
          branchName: 'master',
          logger: logger,
          gmeConfig: gmeConfig
        };
        return testFixture.importProject(storage, importParam);
      })
      .then(function (importResult) {
        project = importResult.project;
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

  it('should run plugin', function (done) {
    var manager = new PluginCliManager(null, logger, gmeConfig);
    var pluginConfig = {};
    var context = {
      project: project,
      branchName: 'master',
    };
    manager.executePlugin(pluginName, pluginConfig, context, function (err, pluginResult) {
      expect(err).to.equal(null);
      expect(typeof pluginResult).to.equal('object');
      expect(pluginResult.success).to.equal(true);
      done();
    });
  });
});
