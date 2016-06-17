/*globals define*/
/*jshint node:true, browser:true*/

/**
 * Generated by PluginGenerator 1.7.0 from webgme on Thu Jun 16 2016 19:09:33 GMT-0500 (CDT).
 * A plugin that inherits from the PluginBase. To see source code documentation about available
 * properties and methods visit %host%/docs/source/PluginBase.html.
 */

define([
  'plugin/PluginConfig',
  'text!./metadata.json',
  'plugin/PluginBase'
], function (
  PluginConfig,
  pluginMetadata,
  PluginBase) {
  'use strict';

  pluginMetadata = JSON.parse(pluginMetadata);

  /**
   * Initializes a new instance of PrepareFunction.
   * @class
   * @augments {PluginBase}
   * @classdesc This class represents the plugin PrepareFunction.
   * @constructor
   */
  var PrepareFunction = function () {
    // Call base class' constructor.
    PluginBase.call(this);
    this.pluginMetadata = pluginMetadata;
  };

  /**
   * Metadata associated with the plugin. Contains id, name, version, description, icon, configStructue etc.
   * This is also available at the instance at this.pluginMetadata.
   * @type {object}
   */
  PrepareFunction.metadata = pluginMetadata;

  // Prototypical inheritance from PluginBase.
  PrepareFunction.prototype = Object.create(PluginBase.prototype);
  PrepareFunction.prototype.constructor = PrepareFunction;

  /**
   * Main function for the plugin to execute. This will perform the execution.
   * Notes:
   * - Always log with the provided logger.[error,warning,info,debug].
   * - Do NOT put any user interaction logic UI, etc. inside this method.
   * - callback always has to be called even if error happened.
   *
   * @param {function(string, plugin.PluginResult)} callback - the result callback
   */
  PrepareFunction.prototype.main = function (callback) {
    // Use self to access core, project, result, logger etc from PluginBase.
    // These are all instantiated at this point.
    var self = this;
    var core = self.core;
    var node = self.activeNode;

    var wutil = require('src/utils/WebgmeUtil');
    var snakeCase = require('snake-case');
    wutil.getApplicationComponents(core, core.getParent(self.activeNode))
      .then(function (app_structure) {
        var name = core.getAttribute(node, 'name');
        var prevs = app_structure.components[name].prev;
        var template = [];
        template = template.concat([
          '/*',
          'Fill in between dashed lines below as in a C function',
          'Define output data type in the \'return\' attribute',
          '',
          'Definition of types:',
          'typedef nx_struct Accel_t {',
          '  nx_int16_t x;',
          '  nx_int16_t y;',
          '  nx_int16_t z;',
          '} Accel_t;',
          'typedef Accel_t Gyro_t;',
          '',
          'Definition of the return type:',
          'typedef nx_struct Function1_t {',
          core.getAttribute(node, 'return').split('\n').map(e => '  ' + e).join('\n'),
          '} Function1_t;',
          '',
          'Available input variables and types are as follows:',
          ''
        ]);
        prevs.forEach(key => {
          key = key.split(':');
          template.push(key[2] + ' ' + snakeCase(key[0] + key[1] + 'Data') + ';');
        });
        template = template.concat([
          '',
          '*/',
          `${name}_t result;`,
          '//---------------------------------------------------',
          '\n\n',
          '//---------------------------------------------------',
          'return result;'
        ]);
        core.setAttribute(node, 'definition', template.join('\n'));
      })
      .then(function () {
        self.save('Function definition is updated.')
          .then(function () {
            self.result.setSuccess(true);
            callback(null, self.result);
          })
          .catch(function (err) {
            // Result success is false at invocation.
            callback(null, self.result);
          });
      })
      .catch(function (error) {
        self.logger.error(error);
        self.result.setSuccess(false);
        callback(error, self.result);
      });

  };

  return PrepareFunction;
});