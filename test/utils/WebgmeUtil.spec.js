describe('WebgmeUtil', function() {
  'use strict';

  var testFixture = require('../globals');
  var rimraf = testFixture.rimraf;
  var Q = testFixture.Q;
  var gmeConfig = testFixture.getGmeConfig();
  var projectName = 'TestProject';
  var logger = testFixture.logger.fork('MainPlugin');
  var gmeAuth, storage, context, core;

  var wutil = testFixture.requirejs('src/utils/WebgmeUtil');
  var _ = require('lodash');

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
        context = importResult;
        core = context.core;
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

  describe('Empty Application', function() {
    it('should return valid App structure', function(done) {
      findApplicationNode('EmptyApplication')
        .then(function (node) {
          return wutil.getApplicationComponents(core, node);
        })
        .then(function (app_structure) {
          app_structure.should.deep.equal({
            name: 'EmptyApplication',
            source: [],
            sink: [],
            components: {}
          });
        })
        .nodeify(done);
    });
  });

  describe('SenseAndSend Application', function() {
    it('should return valid App structure', function(done) {
      findApplicationNode('SenseAndSend')
        .then(function (node) {
          return wutil.getApplicationComponents(core, node);
        })
        .then(function (app_structure) {
          app_structure.should.deep.equal({
            name: 'SenseAndSend',
            source: ['AccelerometerAndGyroscope'],
            sink: ['Radio'],
            components: {
              AccelerometerAndGyroscope: {
                name: 'AccelerometerAndGyroscope',
                type: 'Lsm330dlc',
                rate: 100,
                provides: [
                  {
                    src: 'GyroRead',
                    dst: 'Radio'
                  }
                ],
                prev: [],
                next: ['Radio']
              },
              Radio: {
                name: 'Radio',
                type: 'TosRadio',
                provides: [],
                prev: ['AccelerometerAndGyroscope:GyroRead:Gyro_t'],
                next: []
              }
            }
          });
        })
        .nodeify(done);
    });
  });

  function findChildByName (children, name) {
    return _.find(children, function (child) {
      return core.getAttribute(child, 'name') === name;
    });
  }

  function findApplicationNode (name) {
    return core.loadChildren(context.rootNode)
      .then(function (children) {
        return core.loadChildren(findChildByName(children, 'Workspace'));
      })
      .then(function (children) {
        return findChildByName(children, name);
      });
  }

});
