var EventEmitter = require('eventemitter3');

/**
 * merge objects and create a result.
 * #NOTICE: avoid using arguments for performance reason avoid using arguments..
 */
function merge(a, b, c, d, e, f, g) {
    var dest = {};
    if (g) throw Error('You pass too many args for merge method');
    [a, b, c, d, e, f]
        .filter(Boolean)
        .forEach(function(obj) {
            Object.keys(obj).forEach(function(k) {
                dest[k] = obj[k];
            });
        });
    return dest;
}
function remove(array, index) {
    return array.filter(function(__, i) {
        return index !== i;
    });
}
function empty(obj) { return obj === undefined || obj === null || obj !== obj; }
function assign(obj, _path, value) {
    var path = _path.concat();
    var last = path.pop();
    while (path.length) {
        var p = path.shift();
        if (empty(obj[p])) obj[p] = {};
        obj = obj[p];
    }
    obj[last] = value;
}
function getIn(obj, _path) {
    var path = _path.concat();
    if (empty(obj) && path.length === 0) return obj;
    var last = path.pop();
    while (path.length) {
        var p = path.shift();
        obj = obj[p];
        if (empty(obj)) return void 0;
    }
    return empty(obj) ? void 0 : obj[last];
}
function updateIn(obj, path, value) {
    var originVal = getIn(obj, path);
    if (originVal === value) {
        return false;
    } else {
        assign(obj, path, value);
        return true;
    }
}

function State(state, reviver) {
  this.load(state || {});
  this.emit('change', this._state);
}
State.prototype = new EventEmitter;
State.prototype.load = function (state) {
  this._state = state;
  this.emit('change', this._state);
};
State.prototype.toJS = function () {
  return this._state;
}
State.prototype.cursor = function (path) {
  if (typeof path !== 'string' && !Array.isArray(path)) throw Error('State.prototype.cursor only accept string or array, ' + (typeof path) + ' is forbidden');
  if (!path.length) throw Error('State.prototype.cursor does not accept empty path');
  if (typeof path === 'string') { path = path.split('.'); }
  var me = this;

  function ret(subpath) { return ret.get(subpath); }

  ret.get = function (subpath) {
    if (typeof subpath === 'string') { subpath = subpath.split('.'); }
    return getIn(me._state, path.concat(typeof subpath === 'undefined' ? [] : subpath));
  };

  // please use `update` to update the cursor pointed value.
  ret.update = function (subpath, value) {
    if (typeof subpath === 'function' || typeof subpath === 'function') {
        throw Error('cursor.update does not support unserializable object such as function');
    }
    if (arguments.length === 1) { value = subpath; subpath = []; }
    if (typeof subpath === 'string') subpath = subpath.split('.');
    var p = path.concat(subpath);
    if (updateIn(me._state, p.concat(), value)) {
        // 更新p路径上的所有变量的引用
        var xpath = p.concat();
        me._state = merge(me._state);
        while(xpath.length) {
            xpath.pop();
            xpath.length && assign(me._state, xpath, merge(getIn(me._state, xpath)));
        }
        me.emit('change', this._state);
    }
  };

  return ret;
}
State.prototype.namespace = function (ns) {
    var me = this;
    if (typeof ns === 'string') { ns = ns.split('.'); }
    return {
        cursor: function (path) {
            if (typeof path !== 'string' && !Array.isArray(path)) throw Error('State.prototype.cursor only accept string or array, ' + (typeof path) + ' is forbidden');
            if (!path.length) throw Error('State.prototype.cursor does not accept empty path');
            if (typeof path === 'string') { path = path.split('.'); }
            return me.cursor(ns.concat(path));
        }
    };
}

// minimal set  util helper function to generate new array/object
State.util = {
    // array push/pop/shift/unshift
    push: function (array, item) { return array.concat([item]); },
    unshift: function (array, item) { return [item].concat(array); },
    pop: function (array) { remove(array, array.length -1); },
    shift: function (array) { remove(array, 0); },

    // array remove 
    remove: remove,
    // object merge
    merge: merge
};
State.prototype.util = State.util;

module.exports = State;
