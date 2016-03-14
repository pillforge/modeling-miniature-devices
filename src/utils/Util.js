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
    Object.keys(processed_obj.header_files).forEach(key => {
      var content = processed_obj.header_files[key];
      if (content !== null) {
        fs.outputFileSync(path.join(tmpobj.name, key + '.h'), content);
      }
    });
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
      includes: [],
      interfaces: [],
      variables: [],
      init_calls: [],
      implementations: [],
      header_files: {},
      app_implementations: [],
      cflags_includes: [],
    };
    obj.sink.forEach(sink => {
      o.init_calls.push(_getPartial(components[sink], 'init'));
    });
    Object.keys(components).forEach(key => {
      var component = components[key];
      o.interfaces.push(_getPartial(component, 'interfaces'));
      o.variables.push(_getPartial(component, 'variables'));
      o.implementations.push(_getImplementation(components, component));
      if (component.type.indexOf('Tos') !== 0)
        o.cflags_includes.push(path.join(component_library_path, component.type));
      o.header_files[key] = _getHeader(component);
      o.app_implementations.push(_getAppImplementation(component));
    });
    o.cflags_includes.forEach(include => {
      o.includes = o.includes.concat(fs.readdirSync(include).filter(file => path.extname(file) === '.h'));
    });
    Object.keys(o.header_files).forEach(key => {
      if (o.header_files[key] !== null) {
        o.includes.push(key + '.h');
      }
    });
    return o;
  }

  function _getHeader (component) {
    var header_content = null;
    var type = component.type;
    var header_path = path.join(template_library_path, type, type + '.h.dot');
    if (fs.existsSync(header_path)) {
      header_content = _compileTemplate(path.join(type, type + '.h.dot'), {
        name: component.name
      });
    }
    return header_content;
  }

  function _getPartial (component, part) {
    var type = component.type;
    return _compileTemplate(path.join(type, type + '.' + part + '.nc.dot'), {
      name: component.name,
      name_: snakeCase(component.name),
      rate: component.rate
    });
  }

  function _getAppImplementation (component) {
    return _getPartial(component, 'app');
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
      o.init_calls.push(_getPartial(components[prev], 'init'));
      o.data_variables.push(_getDataVariable(components[prev]));
    });
    component.next.forEach(next => {
      o.event_calls.push(_getPartial(components[next], 'event'));
    });
    var type = component.type;
    return _compileTemplate(path.join(type, type + '.nc.dot'), o);
  }

  function _getDataVariable(component) {
    return snakeCase(component.name + 'Data');
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
