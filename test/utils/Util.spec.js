describe('Util', function() {
  'use strict';

  var testFixture = require('../globals');
  var expect = testFixture.expect;
  var path = require('path');
  var fs = require('fs-extra');
  var util = testFixture.requirejs('src/utils/Util');

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

    it('should compile with a Sensor and Radio', function () {
      var tmpobj = util.compileApplication({
        name: 'Test',
        source: 'AccelGyro',
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
            provides: [],
            prev: ['AccelGyro'],
            next: []
          }
        }
      }, target);

      var c_nc = fs.readFileSync(path.join(tmpobj.name, 'TestC.nc'), 'utf8');
      var appc_nc = fs.readFileSync(path.join(tmpobj.name, 'TestAppC.nc'), 'utf8');
      var makefile = fs.readFileSync(path.join(tmpobj.name, 'Makefile'), 'utf8');
      var radio_h = fs.readFileSync(path.join(tmpobj.name, 'Radio.h'), 'utf8');

      c_nc.should.contain('#include "Lsm330dlc.h"');
      c_nc.should.contain('#include "Radio.h"');

      c_nc.should.contain('uses interface Read<Accel_t> as AccelGyroAccelRead;');
      c_nc.should.contain('uses interface Timer<TMilli> as AccelGyroTimer');
      c_nc.should.contain('uses interface SplitControl as RadioSplitControl;');
      c_nc.should.contain('uses interface Packet as RadioPacket;');
      c_nc.should.contain('uses interface AMSend as RadioAMSend;');

      c_nc.should.contain('Accel_t accel_gyro_data;');
      c_nc.should.contain('uint8_t accel_gyro_timer_rate = 100;');
      c_nc.should.contain('message_t radio_packet;');
      c_nc.should.contain('uint8_t radio_send_addr;');
      c_nc.should.contain('task void RadioSendTask();');
      c_nc.should.contain('');

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
      '    accel_gyro_data = val;',
      '    post RadioSendTask();',
      '  }',
      ].join('\n'));

      c_nc.should.contain([
        '  task void RadioSendTask() {',
        '    RadioDataMsg* msg = (RadioDataMsg*) call RadioPacket.getPayload(&radio_packet, sizeof(RadioDataMsg));',
        '    msg->data = accel_gyro_data;',
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

      c_nc.should.contain([
        '',
        ''
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

  });
});
