define(['plugin/PluginConfig', 'plugin/PluginBase', 'module'],
function (PluginConfig, PluginBase, module) {
  'use strict';

  /**
   * Initializes a new instance of Main.
   * @class
   * @augments {PluginBase}
   * @classdesc This class represents the plugin Main.
   * @constructor
   */
  var Main = function () {
    PluginBase.call(this);
  };

  Main.prototype = Object.create(PluginBase.prototype);
  Main.prototype.constructor = Main;

  /**
   * @returns {string} The name of the plugin.
   * @public
   */
  Main.prototype.getName = function () {
    return 'Main';
  };

  /**
   * @returns {string} The version of the plugin.
   * @public
   */
  Main.prototype.getVersion = function () {
    return '0.1.0';
  };

  /**
   * @param {function(string, plugin.PluginResult)} callback - the result callback
   */
  Main.prototype.main = function (callback) {
    var obj = {
      name: this.core.getAttribute(this.activeNode, 'name')
    };
    this.result.setSuccess(true);
    callback(null, this.result);
  };

  return Main;
});
