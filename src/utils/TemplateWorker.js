define(['module', 'path'], function (module, path) {
  'use strict';

  var template_library_path = path.join(module.uri, '..', '..', 'template-library');

  return {
    compileTemplate: compileTemplate
  };

  function compileTemplate (template_path, obj) {
    return _getDotTemplate(template_path)(obj);
  }

  function _getDotTemplate (template_path) {
    var dot = require('dot');
    var fs = require('fs-extra');
    dot.templateSettings.strip = false;
    template_path = path.join(template_library_path, template_path);
    return dot.template(fs.readFileSync(template_path));
  }

});
