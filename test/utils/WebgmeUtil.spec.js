describe('WebgmeUtil', function() {
  'use strict';

  var testFixture = require('../globals');
  var rimraf = testFixture.rimraf;
  var Q = testFixture.Q;
  var gmeConfig = testFixture.getGmeConfig();
  var projectName = 'TestProject';
  var logger = testFixture.logger.fork('WebgmeUtil');
  var gmeAuth, storage, context, core;

  var wutil = testFixture.requirejs('src/utils/WebgmeUtil');

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
      testFixture.findApplicationNode(core, context.rootNode, 'EmptyApplication')
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
      testFixture.findApplicationNode(core, context.rootNode, 'SenseAndSend')
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
                next: ['Radio'],
                return: undefined,
                definition: undefined,
                address: undefined,
                base: undefined,
                printf: undefined
              },
              Radio: {
                name: 'Radio',
                type: 'TosRadio',
                address: 2,
                provides: [],
                prev: ['AccelerometerAndGyroscope:GyroRead:Gyro_t'],
                next: [],
                return: undefined,
                definition: undefined,
                base: 'exp430',
                printf: 'x:int, y:int, z:int'
              }
            }
          });
        })
        .nodeify(done);
    });
  });

});
