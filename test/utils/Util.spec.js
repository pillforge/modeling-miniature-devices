describe('Util', function() {
  'use strict';

  var testFixture = require('../globals');
  var expect = testFixture.expect;
  var path = require('path');
  var fs = require('fs-extra');
  var util = testFixture.requirejs('src/utils/Util');
  var wutil = testFixture.requirejs('src/utils/WebgmeUtil');

  var rimraf = testFixture.rimraf;
  var Q = testFixture.Q;
  var gmeConfig = testFixture.getGmeConfig();
  var projectName = 'TestProject';
  var logger = testFixture.logger.fork('WebgmeUtil');
  var gmeAuth, storage, result, core;

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

  var target = 'exp430';

  describe('#compileApplication', function() {

    it('should compile with an empty Application', function() {
      var tmpobj = util.compileApplication({
        name: 'Test',
        source: [],
        sink: [],
        components: {}
      }, target);

      [ 'TestC.nc',
        'TestAppC.nc',
        'Makefile',
        path.join('build', target)
      ].forEach(file => {
        var f_path = path.join(tmpobj.name, file);
        expect(fs.existsSync(f_path)).to.equal(true, f_path + ' should exist');
      });

      var c_nc = fs.readFileSync(path.join(tmpobj.name, 'TestC.nc'), 'utf8');
      var appc_nc = fs.readFileSync(path.join(tmpobj.name, 'TestAppC.nc'), 'utf8');
      var makefile = fs.readFileSync(path.join(tmpobj.name, 'Makefile'), 'utf8');

      c_nc.should.contain([
        'module TestC {',
        '  uses interface Boot;',
        '}'
      ].join('\n'));
      c_nc.should.contain([
        '  event void Boot.booted() {',
        '  }'
      ].join('\n'));

      appc_nc.should.contain([
       '  components MainC;',
       '  components TestC as App;',
       '  App.Boot -> MainC;'
      ].join('\n'));

      makefile.should.contain('COMPONENT=TestAppC');
      makefile.should.contain('include $(MAKERULES)');
    });

    describe('compile with a Sensor and Radio', function() {
      it('should compile with AccelRead interface', function () {
        var tmpobj = util.compileApplication({
          name: 'Test',
          source: ['AccelGyro'],
          sink: ['Radio'],
          components: {
            AccelGyro: {
              name: 'AccelGyro',
              type: 'Lsm330dlc',
              rate: 100,
              provides: [
                {
                  src: 'AccelRead',
                  dst: 'Radio'
                }
              ],
              prev: [],
              next: ['Radio']
            },
            Radio: {
              name: 'Radio',
              type: 'TosRadio',
              address: 2,
              provides: [],
              prev: ['AccelGyro:AccelRead:Accel_t'],
              next: []
            }
          }
        }, target);

        var c_nc = fs.readFileSync(path.join(tmpobj.name, 'TestC.nc'), 'utf8');
        var appc_nc = fs.readFileSync(path.join(tmpobj.name, 'TestAppC.nc'), 'utf8');
        var makefile = fs.readFileSync(path.join(tmpobj.name, 'Makefile'), 'utf8');
        var radio_h = fs.readFileSync(path.join(tmpobj.name, 'Radio.h'), 'utf8');

        c_nc.should.contain([
          '#include "Lsm330dlc.h"',
          '#include "Radio.h"'
        ].join('\n'));

        c_nc.should.contain('uses interface Read<Accel_t> as AccelGyroAccelRead;');
        c_nc.should.contain('uses interface Timer<TMilli> as AccelGyroTimer');
        c_nc.should.contain('uses interface SplitControl as RadioSplitControl;');
        c_nc.should.contain('uses interface Packet as RadioPacket;');
        c_nc.should.contain('uses interface AMSend as RadioAMSend;');

        c_nc.should.contain('Accel_t accel_gyro_accel_read_data;');
        c_nc.should.contain('uint8_t accel_gyro_timer_rate = 100;');
        c_nc.should.contain('message_t radio_packet;');
        c_nc.should.contain('uint8_t radio_send_addr = 2;');
        c_nc.should.contain('task void RadioSendTask();');

        c_nc.should.contain([
          '  event void Boot.booted() {',
          '    call RadioSplitControl.start();',
          '  }'
        ].join('\n'));

        c_nc.should.contain([
          '  event void RadioSplitControl.startDone(error_t err) {',
          '    if (err == SUCCESS) {',
          '      call AccelGyroTimer.startPeriodic(accel_gyro_timer_rate);',
          '    } else {',
          '      call RadioSplitControl.start();',
          '    }',
          '  }'
        ].join('\n'));

        c_nc.should.contain([
          '  event void AccelGyroTimer.fired() {',
          '    call AccelGyroAccelRead.read();',
          '  }',
        ].join('\n'));

        c_nc.should.contain([
        '  event void AccelGyroAccelRead.readDone(error_t err, Accel_t val) {',
        '    accel_gyro_accel_read_data = val;',
        '    post RadioSendTask();',
        '  }',
        ].join('\n'));

        c_nc.should.contain([
          '  task void RadioSendTask() {',
          '    RadioDataMsg* msg = (RadioDataMsg*) call RadioPacket.getPayload(&radio_packet, sizeof(RadioDataMsg));',
          '    msg->data = accel_gyro_accel_read_data;',
          '    call RadioAMSend.send(radio_send_addr, &radio_packet, sizeof(RadioDataMsg));',
          '  }'
        ].join('\n'));

        c_nc.should.contain([
          '  event void RadioSplitControl.stopDone(error_t err) {',
          '  }'
        ].join('\n'));

        c_nc.should.contain([
          '  event void RadioAMSend.sendDone(message_t* bufPtr, error_t error) {',
          '  }'
        ].join('\n'));

        appc_nc.should.contain('components Lsm330dlcC as AccelGyro;');
        appc_nc.should.contain('components new TimerMilliC() as AccelGyroTimer;');
        appc_nc.should.contain('App.AccelGyroAccelRead -> AccelGyro.AccelRead;');
        appc_nc.should.contain('App.AccelGyroTimer -> AccelGyroTimer;');

        appc_nc.should.contain('components new AMSenderC(AM_RADIO) as RadioAMSenderC;');
        appc_nc.should.contain('components ActiveMessageC as RadioActiveMessageC;');
        appc_nc.should.contain('App.RadioAMSend -> RadioAMSenderC;');
        appc_nc.should.contain('App.RadioSplitControl -> RadioActiveMessageC;');
        appc_nc.should.contain('App.RadioPacket -> RadioActiveMessageC;');

        makefile.should.match(/CFLAGS\+=-I.*Lsm330dlc/);

        radio_h.should.contain([
          'typedef nx_struct RadioDataMsg {',
          '  Accel_t data;',
          '} RadioDataMsg;'
        ].join('\n'));
      });

      it('should compile with GyroRead interface', function () {
        var tmpobj = util.compileApplication({
          name: 'Test',
          source: ['AccelGyro'],
          sink: ['Radio'],
          components: {
            AccelGyro: {
              name: 'AccelGyro',
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
              address: 2,
              provides: [],
              prev: ['AccelGyro:GyroRead:Gyro_t'],
              next: []
            }
          }
        }, target);

        var c_nc = fs.readFileSync(path.join(tmpobj.name, 'TestC.nc'), 'utf8');
        var appc_nc = fs.readFileSync(path.join(tmpobj.name, 'TestAppC.nc'), 'utf8');
        var makefile = fs.readFileSync(path.join(tmpobj.name, 'Makefile'), 'utf8');
        var radio_h = fs.readFileSync(path.join(tmpobj.name, 'Radio.h'), 'utf8');

        c_nc.should.contain('uses interface Read<Gyro_t> as AccelGyroGyroRead;');

        c_nc.should.contain('Gyro_t accel_gyro_gyro_read_data;');

        c_nc.should.contain([
          '  event void AccelGyroTimer.fired() {',
          '    call AccelGyroGyroRead.read();',
          '  }',
        ].join('\n'));

        c_nc.should.contain([
        '  event void AccelGyroGyroRead.readDone(error_t err, Gyro_t val) {',
        '    accel_gyro_gyro_read_data = val;',
        '    post RadioSendTask();',
        '  }',
        ].join('\n'));

        c_nc.should.contain([
          '  task void RadioSendTask() {',
          '    RadioDataMsg* msg = (RadioDataMsg*) call RadioPacket.getPayload(&radio_packet, sizeof(RadioDataMsg));',
          '    msg->data = accel_gyro_gyro_read_data;',
          '    call RadioAMSend.send(radio_send_addr, &radio_packet, sizeof(RadioDataMsg));',
          '  }'
        ].join('\n'));

        appc_nc.should.contain('App.AccelGyroGyroRead -> AccelGyro.GyroRead;');

        radio_h.should.contain([
          'typedef nx_struct RadioDataMsg {',
          '  Gyro_t data;',
          '} RadioDataMsg;'
        ].join('\n'));
      });

      it('should compile with AccelRead and GyroRead interfaces and two Radios', function () {
        var tmpobj = util.compileApplication({
          name: 'Test',
          source: ['AccelGyro'],
          sink: ['Radio1', 'Radio2'],
          components: {
            AccelGyro: {
              name: 'AccelGyro',
              type: 'Lsm330dlc',
              rate: 100,
              provides: [
                {
                  src: 'AccelRead',
                  dst: 'Radio1'
                },
                {
                  src: 'GyroRead',
                  dst: 'Radio2'
                }
              ],
              prev: [],
              next: ['Radio1', 'Radio2']
            },
            Radio1: {
              name: 'Radio1',
              type: 'TosRadio',
              address: 2,
              provides: [],
              prev: ['AccelGyro:AccelRead:Accel_t'],
              next: []
            },
            Radio2: {
              name: 'Radio2',
              type: 'TosRadio',
              address: 2,
              provides: [],
              prev: ['AccelGyro:GyroRead:Gyro_t'],
              next: []
            }
          }
        }, target);

        var c_nc = fs.readFileSync(path.join(tmpobj.name, 'TestC.nc'), 'utf8');
        var appc_nc = fs.readFileSync(path.join(tmpobj.name, 'TestAppC.nc'), 'utf8');
        var makefile = fs.readFileSync(path.join(tmpobj.name, 'Makefile'), 'utf8');
        var radio1_h = fs.readFileSync(path.join(tmpobj.name, 'Radio1.h'), 'utf8');
        var radio2_h = fs.readFileSync(path.join(tmpobj.name, 'Radio2.h'), 'utf8');

        c_nc.should.contain('uint8_t accel_gyro_init_counter = 0;');

        c_nc.should.contain([
          '  event void Radio1SplitControl.startDone(error_t err) {',
          '    if (err == SUCCESS) {',
          '      atomic {',
          '        if (++accel_gyro_init_counter == 2) {',
          '          call AccelGyroTimer.startPeriodic(accel_gyro_timer_rate);',
          '        }',
          '      }',
          '    } else {',
          '      call Radio1SplitControl.start();',
          '    }',
          '  }'
        ].join('\n'));

        c_nc.should.contain([
          'event void AccelGyroAccelRead.readDone(error_t err, Accel_t val) {',
          '  accel_gyro_accel_read_data = val;',
          '  post Radio1SendTask();',
          '}'
        ].join('\n  '));

        var am1 = radio1_h.match(/AM_RADIO1 = (.*)/)[1];
        var am2 = radio2_h.match(/AM_RADIO2 = (.*)/)[1];
        am1.should.not.equal(am2);
      });
    });

    describe('compile an Application with Accumulator', function() {
      it('should compile with Accumulator', function(done) {
        testFixture.findApplicationNode(core, result.rootNode, 'CombineTwoSensors')
          .then(function (node) {
            return wutil.getApplicationComponents(core, node);
          })
          .then(function (app_structure) {
            var tmpobj = util.compileApplication(app_structure, target);
            expect(tmpobj.__err).to.equal(undefined);
            var c_nc = fs.readFileSync(path.join(tmpobj.name, 'CombineTwoSensorsC.nc'), 'utf8');
            var radio_h = fs.readFileSync(path.join(tmpobj.name, 'Radio.h'), 'utf8');
            var accumulator_h = fs.readFileSync(path.join(tmpobj.name, 'Accumulator.h'), 'utf8');

            c_nc.should.contain('Accumulator_t accumulator_output_data;');
            c_nc.should.contain([
              'task void RadioSendTask() {',
              '  RadioDataMsg* msg = (RadioDataMsg*) call RadioPacket.getPayload(&radio_packet, sizeof(RadioDataMsg));',
              '  msg->data = accumulator_output_data;',
              '  call RadioAMSend.send(radio_send_addr, &radio_packet, sizeof(RadioDataMsg));',
              '}'
            ].join('\n  '));

            c_nc.should.contain([
              'void AccumulatorPassData() {',
              '  accumulator_output_data.accelerometer_and_gyroscope_gyro_read_data = accelerometer_and_gyroscope_gyro_read_data;',
              '  accumulator_output_data.accelerometer_and_gyroscope_accel_read_data = accelerometer_and_gyroscope_accel_read_data;',
              '  post RadioSendTask();',
              '}'
            ].join('\n  '));

            radio_h.should.contain('#include "Accumulator.h"');
            radio_h.should.contain([
              'typedef nx_struct RadioDataMsg {',
              '  Accumulator_t data;',
              '} RadioDataMsg;'
            ].join('\n'));

            accumulator_h.should.contain([
              'typedef nx_struct Accumulator_t {',
              '  Gyro_t accelerometer_and_gyroscope_gyro_read_data;',
              '  Accel_t accelerometer_and_gyroscope_accel_read_data;',
              '} Accumulator_t;'
            ].join('\n'));

          })
          .nodeify(done);
      });
    });

    describe('compile an Application with Function', function() {
      it('should compile with Function', function(done) {
        testFixture.findApplicationNode(core, result.rootNode, 'UseFunction')
          .then(function (node) {
            return wutil.getApplicationComponents(core, node);
          })
          .then(function (app_structure) {
            var tmpobj = util.compileApplication(app_structure, target);
            expect(tmpobj.__err).to.equal(undefined);
            var c_nc = fs.readFileSync(path.join(tmpobj.name, 'UseFunctionC.nc'), 'utf8');
            var function1_h = fs.readFileSync(path.join(tmpobj.name, 'Function1.h'), 'utf8');
          })
          .nodeify(done);
      });
    });

  });
});
