define(['module', 'path', 'tmp', 'fs-extra', 'dot', 'snake-case'], function (module, path, tmp, fs, dot, snakeCase) {
  'use strict';

  var template_library_path = path.join(module.uri, '..', '..', 'template-library');
  var component_library_path = path.join(module.uri, '..', '..', 'component-library');

  return {
    compileApplication: compileApplication
  };

  function compileApplication (obj, target) {
    var tmpobj = tmp.dirSync();
    var processed_obj = _processObj(obj);
    var config_nc = _compileTemplate('Application/ApplicationAppC.nc.dot', processed_obj);
    var module_nc = _compileTemplate('Application/ApplicationC.nc.dot', processed_obj);
    var makefile = _compileTemplate('Application/Makefile.dot', processed_obj);
    fs.outputFileSync(path.join(tmpobj.name, obj.name + 'AppC.nc'), config_nc);
    fs.outputFileSync(path.join(tmpobj.name, obj.name + 'C.nc'), module_nc);
    fs.outputFileSync(path.join(tmpobj.name, 'Makefile'), makefile);
    var execSync = require('child_process').execSync;
    if (target) {
      execSync('make ' + target, {
        cwd: tmpobj.name
      });
    }
    return tmpobj;
  }

  function _processObj (obj) {
    var o = {
      name: obj.name,
      cflags_includes: [],
      timers: [],
      components: [],
      includes: []
    };
    Object.keys(obj.components).forEach(key => {
      var component = obj.components[key];
      if (component.rate) {
        o.timers.push({
          name: component.name + 'Timer',
          name_: snakeCase(component.name + 'TimerRate'),
          rate: component.rate
        });
      }
      o.cflags_includes.push(path.join(component_library_path, component.type));
      o.components.push({
        name: component.name,
        type: component.type + 'C',
        connections: component.provides.map(conn => {
          var c = conn.src.split(':');
          return {
            type: c[0],
            as: c[1],
            command: c[2]
          };
        })
      });
    });
    o.cflags_includes.forEach(include => {
      o.includes = o.includes.concat(fs.readdirSync(include).filter(file => path.extname(file) === '.h'));
    });
    return o;
  }

  function _compileTemplate (template_path, obj) {
    return _getDotTemplate(template_path)(obj);
  }

  function _getDotTemplate (template_path) {
    dot.templateSettings.strip = false;
    template_path = path.join(template_library_path, template_path);
    return dot.template(fs.readFileSync(template_path));
  }

});
