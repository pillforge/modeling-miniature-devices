define(['q'], function (Q) {
  'use strict';

  return {
    getApplicationComponents: getApplicationComponents
  };

  function getApplicationComponents (core, node) {
    var obj = {
      name: core.getAttribute(node, 'name'),
      source: [],
      sink: [],
      components: {}
    };
    return core.loadChildren(node)
      .then(function (children) {
        var components = children.filter(child => core.isInstanceOf(child, 'Component'));
        components.forEach(comp => {
          var name = core.getAttribute(comp, 'name');
          obj.components[name] = {
            name: name,
            type: core.getAttribute(comp, 'type'),
            provides: [],
            prev: [],
            next: [],
            return: core.getAttribute(comp, 'return'),
            definition: core.getAttribute(comp, 'definition'),
            address: core.getAttribute(comp, 'address'),
            base: core.getAttribute(comp, 'base'),
            printf: core.getAttribute(comp, 'printf')
          };
          var rate = core.getAttribute(comp, 'rate');
          if (rate) {
            obj.components[name].rate = parseInt(rate);
          }
        });
        var connections = children.filter(child => core.isInstanceOf(child, 'Connection'));
        return Q.all(connections.map(conn => {
          return Q.all([
            core.loadPointer(conn, 'src'),
            core.loadPointer(conn, 'dst'),
          ]);
        }));
      })
      .then(function (connections) {
        connections.forEach(conn => {
          var src = conn[0];
          var dst = conn[1];
          var src_parent = core.getParent(src);
          var src_name = core.getAttribute(src, 'name');
          var dst_name = core.getAttribute(dst, 'name');
          var src_parent_name = core.getAttribute(src_parent, 'name');
          obj.components[src_parent_name].next.push(dst_name);
          obj.components[src_parent_name].provides.push({
            src: src_name,
            dst: dst_name
          });
          obj.components[dst_name].prev.push([
            src_parent_name,
            src_name,
            core.getAttribute(src, 'type')
          ].join(':'));
        });
        Object.keys(obj.components).forEach(key => {
          var comp = obj.components[key];
          if (comp.prev.length === 0)
            obj.source.push(key);
          if (comp.next.length === 0)
            obj.sink.push(key);
        });
        return obj;
      });
  }

});
