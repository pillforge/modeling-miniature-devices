define([
  'plugin/PluginConfig',
  'plugin/PluginBase'
], function (PluginConfig, PluginBase) {
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
    var self = this;
    var wutil = require('src/utils/WebgmeUtil');
    var util = require('src/utils/Util');
    var target = self.core.getAttribute(self.activeNode, 'target');
    wutil.getApplicationComponents(self.core, self.activeNode)
      .then(function (app_structure) {
        self.logger.info(JSON.stringify(app_structure, null, '  '));
        var tmpobj = util.compileApplication(app_structure, target);
        self.logger.info(tmpobj.name);
        if (tmpobj.__err) {
          self.logger.error(tmpobj.name);
          throw new Error(tmpobj.__err);
        }
        return zipAndSave(self, tmpobj.name, app_structure.name);
      })
      .then(function (hashes) {
        self.result.addArtifact(hashes[0]);
        self.result.setSuccess(true);
        callback(null, self.result);
      })
      .catch(function (error) {
        self.result.setSuccess(false);
        callback(error, self.result);
      });
  };

  function zipAndSave (context, directory, name) {
    var fs = require('fs-extra');
    var path = require('path');
    var execSync = require('child_process').execSync;
    var zip_file = name + '.zip';
    execSync('zip -r ' + zip_file + ' *', {
      cwd: directory
    });
    var bc = context.blobClient;
    var artifact = bc.createArtifact(name);
    var content = fs.readFileSync(path.join(directory, zip_file));
    return artifact.addFile(zip_file, content)
      .then(function (hashes) {
        return bc.saveAllArtifacts();
      });
  }

  return Main;
});
