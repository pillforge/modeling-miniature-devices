/*jshint node: true*/

'use strict';

var config = require('./config.webgme');
var validateConfig = require('webgme/config/validator');

config.seedProjects.basePaths = config.seedProjects.basePaths
  .filter(path => path.indexOf('webgme') === -1);
config.seedProjects.defaultProject = 'MainProject';

validateConfig(config);
module.exports = config;
