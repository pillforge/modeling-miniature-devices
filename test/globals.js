// This is used by the test/plugins tests
/*globals requireJS*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var testFixture = require('webgme/test/_globals'),
  WEBGME_CONFIG_PATH = '../config';

// This flag will make sure the config.test.js is being used
// process.env.NODE_ENV = 'test'; // This is set by the require above, overwrite it here.

var WebGME = testFixture.WebGME,
  gmeConfig = require(WEBGME_CONFIG_PATH),
  getGmeConfig = function getGmeConfig() {
  // makes sure that for each request it returns with a unique object and tests will not interfere
  if (!gmeConfig) {
    // if some tests are deleting or unloading the config
    gmeConfig = require(WEBGME_CONFIG_PATH);
  }
  return JSON.parse(JSON.stringify(gmeConfig));
};

WebGME.addToRequireJsPaths(gmeConfig);

testFixture.getGmeConfig = getGmeConfig;

var path = require('path');
testFixture.rootPath = path.join(__dirname, '..');

testFixture.findChildByName = function (core, children, name) {
  var _ = require('lodash');
  return _.find(children, function (child) {
    return core.getAttribute(child, 'name') === name;
  });
};

testFixture.findApplicationNode = function (core, root_node, name) {
  return core.loadChildren(root_node)
    .then(function (children) {
      return core.loadChildren(testFixture.findChildByName(core, children, 'Workspace'));
    })
    .then(function (children) {
      return testFixture.findChildByName(core, children, name);
    });
};

module.exports = testFixture;
