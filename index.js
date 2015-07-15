var EventEmitter = require('eventemitter3');

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
  if (path && typeof path === 'string') { path = path.split('.'); }
  if (!path) path = [];
  var me = this;

  function ret(subpath) { return ret.get(subpath); }

  ret.get = function (subpath) {
    if (typeof subpath === 'string') { subpath = subpath.split('.'); }
    return getIn(me._state, path.concat(typeof subpath === 'undefined' ? [] : subpath));
  };

  // please use `update` to update the cursor pointed value.
  // raw means if we should convert the value into immutableJS.
  ret.update = function (subpath, value) {
    if (arguments.length === 1) { value = subpath; subpath = []; }
    if (typeof subpath === 'string') subpath = subpath.split('.');
    if (updateIn(me._state, path.concat(subpath), value)) {
        me.emit('change', this._state);
    }
  };

  return ret;
}

module.exports = State;
