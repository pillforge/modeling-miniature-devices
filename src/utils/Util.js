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
    var module_nc = _compileTemplate('Application/ApplicationC.nc.dot', processed_obj);
    var makefile = _compileTemplate('Application/Makefile.dot', processed_obj);
    var config_nc = _compileTemplate('Application/ApplicationAppC.nc.dot', processed_obj);
    fs.outputFileSync(path.join(tmpobj.name, obj.name + 'C.nc'), module_nc);
    fs.outputFileSync(path.join(tmpobj.name, obj.name + 'AppC.nc'), config_nc);
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
    var components = obj.components;
    var o = {
      name: obj.name,
      init_calls: [],
      implementations: []
    };
    obj.sink.forEach(sink => {
      o.init_calls.push(_getInitCalls(components[sink]));
    });
    Object.keys(components).forEach(key => {
      o.implementations.push(_getImplementation(components, components[key]));
    });
    return o;
  }

  function _getImplementation (components, component) {
    var o = {
      name: component.name,
      name_: snakeCase(component.name),
      init_calls: [],
      event_calls: [],
      data_variables: []
    };
    component.prev.forEach(prev => {
      o.init_calls.push(_getInitCalls(components[prev]));
      o.data_variables.push(_getDataVariable(components[prev]));
    });
    component.next.forEach(next => {
      o.event_calls.push(_getEventCalls(components[next]));
    });
    var type = component.type;
    return _compileTemplate(path.join(type, type + '.nc.dot'), o);
  }

  function _getDataVariable(component) {
    return snakeCase(component.name + 'Data');
  }

  function _getEventCalls (component) {
    var type = component.type;
    return _compileTemplate(path.join(type, type + '.event.nc.dot'), {
      name: component.name
    });
  }

  function _getInitCalls (component) {
    var type = component.type;
    return _compileTemplate(path.join(type, type + '.init.nc.dot'), {
      name: component.name,
      name_: snakeCase(component.name),
    });
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
