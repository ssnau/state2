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
function keyPathsCall(obj, fn) {
    var keys = [];
    function traverse(obj) {
        // 超过十层，自动终止，防止循环引用导致死循环
        if (keys.length >= 10) {
            fn(keys.concat(), obj);
            return;
        }

        if (typeof obj !== 'object') {
            fn(keys.concat(), obj);
            return;
        }

        Object.keys(obj).forEach(function (key) {
            keys.push(key);
            traverse(obj[key]);
            keys.pop();
        });
    }

    traverse(obj);
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
State.prototype.cursor = function (path, errorplaceholder) {
  if (errorplaceholder) throw Error("cursor doesn't support a second argument");
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
    if (typeof subpath === 'function') {
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
            xpath.length && INNER.assign(me._state, xpath, merge(getIn(me._state, xpath)));
        }
        me.emit('change', this._state);
    }
  };

  ret.mergeUpdate = function (value) {
    var changed, changedPaths = [];
    keyPathsCall(value, function(kpath, val) {
        changed = updateIn(me._state, path.concat(kpath), val) || changed;
        changedPaths.push(path.concat(kpath));
    });
    var cached = [], JOIN_MARK = "!@#@";
    changedPaths.forEach(function(p) {
        var xpath = p.concat();
        me._state = merge(me._state);
        while (xpath.length) {
            xpath.pop();
            // 如果在xpath处已经有了，说明也不用比较更短路径了，直接break
            if (cached.indexOf(xpath.join(JOIN_MARK)) > 0) break;
            cached.push(xpath.join(JOIN_MARK));
            xpath.length && INNER.assign(me._state, xpath, merge(getIn(me._state, xpath)));
        }
    });
    changedPaths.length && me.emit('change', this._state);
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
    // 将array有副作用的方法push/pop/shift/unshift/sort实现一遍无副作用版的
    push: function (array, item) { return array.concat([item]); },
    unshift: function (array, item) { return [item].concat(array); },
    pop: function (array) { return remove(array, array.length -1); },
    shift: function (array) { return remove(array, 0); },
    sort: function (array, compareFn) { return array.concat().sort(compareFn); },
    reverse: function (array) { return array.concat().reverse(); },
    splice: function (array) { 
        var x = array.concat(); 
        var args = [].slice.call(arguments, 1);
        x.splice.apply(x, args); 
        return x;
   },

    // array remove
    remove: remove,
    // object merge
    merge: merge
};

/**
 * 如果直接修改Object.prototype，mocha的coverage会跑挂,大概是因为enumerable的原因
 */
function defindProps(obj, name, value) {
    if (Object.defineProperty) {
        Object.defineProperty(obj, name, {
              enumerable: false,
                configurable: true,
                  writable: true,
                    value: value
        });
    } else {
        obj[name] = value;
    }
}

State.X_PREFIX = 'x';
State.injectPrototype = function () {
    ['push', 'unshift', 'pop', 'shift', 'sort', 'reverse', 'splice', 'remove']
        .forEach(function(name) {
            defindProps(Array.prototype, 'x' + name, function(a, b) {
                return State.util[name](this, a, b);
            });
        });
    // argument对性能有很大影响，故单独放出
    defindProps(Array.prototype, State.X_PREFIX + 'splice', function () {
        return State.util.splice.apply(null , [this].concat([].slice.call(arguments)));
    });
    defindProps(Object.prototype, State.X_PREFIX + 'merge', function(a, b, c, d, e) {
        return merge(this, a, b, c, d, e);
    });
}

State.prototype.util = State.util;
State.prototype.injectPrototype = State.injectPrototype;

module.exports = State;

// For test reason
var INNER = State.INNER_FUNC = {
    assign: assign,
    keyPathsCall: keyPathsCall
};
