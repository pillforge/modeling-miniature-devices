/*jshint node: true*/

'use strict';

var config = require('./config.webgme');
var validateConfig = require('webgme/config/validator');

config.requirejsPaths.src = 'src';

config.seedProjects.basePaths = config.seedProjects.basePaths
  .filter(path => path.indexOf('webgme') === -1);
config.seedProjects.defaultProject = 'MainProject';

config.plugin.allowServerExecution = true;
config.plugin.allowBrowserExecution = false;

validateConfig(config);
module.exports = config;
