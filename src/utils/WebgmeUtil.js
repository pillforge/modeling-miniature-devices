define([], function () {
  'use strict';

  return {
    getApplicationComponents: getApplicationComponents
  };

  function getApplicationComponents (core, node) {
    return {
      name: core.getAttribute(node, 'name'),
      source: [],
      sink: [],
      components: {}
    };
  }

});
