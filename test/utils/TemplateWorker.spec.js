describe('TemplateWorker', function() {
  'use strict';
  var testFixture = require('../globals');
  var path = require('path');
  var temp_worker = testFixture.requirejs('src/utils/TemplateWorker');
  describe('#compileTemplate', function() {
    it('generate empty Application', function() {
      var appc_dot_path = path.join('Application', 'ApplicationAppC.nc.dot');
      var appc_nc = temp_worker.compileTemplate(appc_dot_path, {
        name: 'Test'
      });
      appc_nc.should.contain('configuration TestAppC');
      appc_nc.should.contain('App.Boot -> MainC');
    });
  });
});
