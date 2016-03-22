define(['module', 'path', 'tmp', 'fs-extra', 'dot', 'snake-case', 'lodash'],
function (module, path, tmp, fs, dot, snakeCase, _) {
  'use strict';

  var template_library_path = path.join(module.uri, '..', '..', 'template-library');
  var component_library_path = path.join(module.uri, '..', '..', 'component-library');
  var globally_unique_number = 0;

  return {
    compileApplication: compileApplication
  };

  function compileApplication (obj, target) {
    _checkAppStructure(obj);
    var tmpobj = tmp.dirSync();
    globally_unique_number = 0;
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
    try {
      if (target) {
        execSync('make ' + target, {
          cwd: tmpobj.name
        });
      }
    } catch (error) {
      tmpobj.__err = error;
    }
    return tmpobj;
  }

  function _checkAppStructure (app_structure) {
    var list_of_supported_templates = _getSupportedComponents(template_library_path);
    var list_of_unsupported_used_components = [];
    Object.keys(app_structure.components).forEach(comp => {
      var component = app_structure.components[comp];
      if (!_.includes(list_of_supported_templates, component.type)) {
        if (component.type === '') {
          list_of_unsupported_used_components.push('Unspecified type for ' + comp);
        } else {
          list_of_unsupported_used_components.push('Unsupported type for ' + comp + ': ' + component.type);
        }
      }
    });
    if (list_of_unsupported_used_components.length > 0) {
      throw list_of_unsupported_used_components.join('.\n');
    }
  }

  function _getSupportedComponents (kind) {
    return fs.readdirSync(kind).filter(file => {
      return fs.statSync(path.join(kind, file)).isDirectory();
    });
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

    Object.keys(components).forEach(key => {
      var component = components[key];
      var oc = _getComponentObj(component);
      o.header_files[key] = _getHeader(component);
      o.interfaces.push(_getPartial('interfaces', oc));
      oc.number_of_next = component.provides.length;
      o.variables.push(_getPartial('variables', oc));
      o.implementations.push(_getImplementation(components, component, oc));
      var list_of_supported_components = _getSupportedComponents(component_library_path);
      if (_.includes(list_of_supported_components, component.type))
        o.cflags_includes.push(path.join(component_library_path, component.type));
      o.app_implementations.push(_getPartial('app', _getComponentObj(component)));
    });

    obj.sink.forEach(sink => {
      o.init_calls.push(_getPartial('init', _getComponentObj(components[sink])));
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

  function _getComponentObj (component) {
    return {
      name: component.name,
      type: component.type,
      name_: snakeCase(component.name),
      rate: component.rate,
      interfaces: component.provides.map(conn => conn.src)
    };
  }

  function _getHeader (component) {
    var header_content = null;
    var type = component.type;
    var header_path = path.join(template_library_path, type, type + '.h.dot');
    if (fs.existsSync(header_path)) {
      header_content = _compileTemplate(path.join(type, type + '.h.dot'), {
        name: component.name,
        data_fields: _getDataFields(component),
        globally_unique_number: globally_unique_number++
      });
    }
    return header_content;
  }

  function _getDataFields (component) {
    return component.prev.map(interf => {
      var pieces = interf.split(':');
      var type = pieces[2] ? pieces[2] : pieces[0] + '_t';
      return {
        name: snakeCase(pieces[0] + pieces[1]),
        type: type
      };
    });
  }

  function _getPartial (part, oc) {
    return _compileTemplate(path.join(oc.type, oc.type + '.' + part + '.nc.dot'), oc);
  }

  function _getImplementation (components, component, oc) {
    var o = {
      name: component.name,
      name_: snakeCase(component.name),
      init_calls: [],
      event_calls: {},
      data_variables: [],
      interfaces: oc.interfaces
    };
    component.prev.forEach(prev => {
      var prev_split = prev.split(':');
      var c_name = prev_split[0];
      var i_name = prev_split[1];
      var oc = _getComponentObj(components[c_name]);
      oc.number_of_next = components[c_name].provides.length;
      o.init_calls.push(_getPartial('init', oc));
      o.data_variables.push(snakeCase(c_name + i_name + 'Data'));
    });
    component.provides.forEach(conn => {
      var ec = _getPartial('event', _getComponentObj(components[conn.dst]));
      o.event_calls[conn.src] = o.event_calls[conn.src] || [];
      o.event_calls[conn.src].push(ec);
    });
    var type = component.type;
    return _compileTemplate(path.join(type, type + '.nc.dot'), o);
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
