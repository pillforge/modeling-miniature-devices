describe('Util', function() {
  'use strict';

  var testFixture = require('../globals');
  var expect = testFixture.expect;
  var path = require('path');
  var fs = require('fs-extra');
  var util = testFixture.requirejs('src/utils/Util');

  var target = 'exp430';

  describe('#compileApplication', function() {
    it('should generate barebone Application', function() {
      var tmpobj = util.compileApplication({name: 'Test'}, target);
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
  });
});
