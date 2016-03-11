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
      var appc_nc = fs.readFileSync(path.join(tmpobj.name, 'TestAppC.nc'), 'utf8');
      appc_nc.should.contain('configuration TestAppC');
      appc_nc.should.contain('App.Boot -> MainC');
    });

    it('should compile with a Sensor', function () {
      var tmpobj = util.compileApplication({
        name: 'Test',
        components: {
          AccelGyro: {
            name: 'AccelGyro',
            type: 'Lsm330dlc',
            rate: 100,
            provides: [
              {
                src: 'Read<Accel_t>:AccelRead:read',
                dst: ''
              }
            ]
          }
        }
      }, target);
      var makefile = fs.readFileSync(path.join(tmpobj.name, 'Makefile'), 'utf8');
      makefile.should.match(/CFLAGS\+=-I.*Lsm330dlc/);

      var appc_nc = fs.readFileSync(path.join(tmpobj.name, 'TestAppC.nc'), 'utf8');
      appc_nc.should.contain('components new TimerMilliC() as AccelGyroTimer;');
      appc_nc.should.contain('App.AccelGyroTimer -> AccelGyroTimer;');

      appc_nc.should.contain('components Lsm330dlcC as AccelGyro;');
      appc_nc.should.contain('App.AccelRead -> AccelGyro.AccelRead;');
      appc_nc.should.contain('');

      var c_nc = fs.readFileSync(path.join(tmpobj.name, 'TestC.nc'), 'utf8');
      c_nc.should.contain('interface Timer<TMilli> as AccelGyroTimer;');
      c_nc.should.contain('uint8_t accel_gyro_timer_rate = 100;');
      c_nc.should.contain('call AccelGyroTimer.startPeriodic(accel_gyro_timer_rate);');
      c_nc.should.contain('event void AccelGyroTimer.fired() {');

      c_nc.should.contain('#include "Lsm330dlc.h"');
      c_nc.should.contain('uses interface Read<Accel_t> as AccelRead;');
      c_nc.should.contain('call AccelRead.read();');
      c_nc.should.contain('event void AccelRead.readDone(error_t err, Accel_t val) {');
      c_nc.should.contain('');
    });

  });

});
