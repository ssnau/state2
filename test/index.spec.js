var assert = require('assert');
var State = require('../');

describe('cursor should work', function() {
    it('cursor', function() {
        var state = new State();
        state.load({
            profile: {
                name: "jack",
                age: 10
            }
        });

        var cursor = state.cursor('profile');
        assert.equal(cursor().name, 'jack');

        cursor.update('name', 'john');
        assert.equal(cursor.get('name'),'john');
        assert.equal(cursor().age, 10);
    });

    it('empty path should throw error', function() {
        var state = new State();
        state.load({
            profile: {
                name: "jack",
                age: 10
            }
        });

        // undefined
        assert.throws(function(){ state.cursor(); });
        // object
        assert.throws(function(){ state.cursor({}); });
        
        // empty
        assert.throws(function(){ state.cursor(''); });
        assert.throws(function(){ state.cursor([]); });
    });

    it('cursor can be update', function () {
        var state = new State();
        state.load({
            profile: {
                name: "jack",
                age: 10
            }
        });
        var profileCursor = state.cursor('profile');
        // completely rewrite the cursor value
        profileCursor.update('hello world');
        assert.equal(profileCursor(), 'hello world');

        profileCursor.update({ship: 'titanic'});
        assert.deepEqual(profileCursor(), {ship: 'titanic'});
    });

    it('set cursor value as undefined', function () {
        var state = new State();
        state.load({
            profile: {
                name: "jack",
                age: 10
            }
        });
        var profileCursor = state.cursor('profile');

        profileCursor.update(undefined);
        assert.deepEqual(profileCursor(), undefined)
    });

    it('should fire event after update value', function () {
        var state = new State({ name: 'jack' });
        var nameCursor = state.cursor('name');
        var count = 0;
        state.on('change', function(v) { count++; });
        
        assert.equal(count, 0);
        nameCursor.update('taylor');
        assert.equal(count, 1);
        nameCursor.update('swift');
        assert.equal(count, 2);

        // wont fire event if the value does not changed
        nameCursor.update('swift');
        assert.equal(count, 2);
    });

    it('should automatically fill the path', function () {
        var state = new State();
        var nameCursor = state.cursor('name.familyName');

        assert.equal(nameCursor(), void 0);
        nameCursor.update('taylor');
        assert.equal(nameCursor(), 'taylor');
    });

    it('test array|string as path', function () {
        var state = new State({
            profile: {
                name: 'jack'
            },
            "big.secret": {
                key: "open-the-door"
            }
        });
        // path 可以是以点分隔的路径
        var cursor = state.cursor('profile.name');
        assert.equal(cursor(), 'jack');

        // path可以是数组
        var cursor = state.cursor(['big.secret', 'key']);
        assert.equal(cursor(), 'open-the-door');
    });

    it('example', function () {
        // 任意一个cursor导致的更新都将让state内部的指针指向新的状态
        // 且之后的cursor返回值都是基于这个新的状态的路径的值
        var state = new State({
               name: 'jack',
               profile: {
                       gender: 'male'
                   }
        });
         
        // 通过cursor方法得到cursor
        var nameCursor = state.cursor('name');
        var profileCursor = state.cursor('profile');
        var genderCursor = state.cursor('profile.gender');
         
        // 通过调用cursor函数得到cursor对应的值
        assert.equal(nameCursor(), 'jack');
        assert.equal(genderCursor(), 'male');
         
        // 通过调用cursor的update方法，更新其对应值
        nameCursor.update('john');
         
        // 如果只想更新其部分值，可传入回调。
        // 回调的参数是cursor对应的值，应当返回一个与之相对应拷贝。
        profileCursor.update('gender', 'female'); 

        // 能过调用cursor函数获得已经更新的值
        assert.equal(nameCursor(), 'john');
        assert.equal(genderCursor(), 'female');
    });

    it('update', function () {
        var state = new State();
        state.load({
            profile: {
                name: "jack",
                age: 10,
                parent: {
                    mother: {
                        name: 'nina'
                    },
                    father: {
                        name: 'chris'
                    }
                }
            }
        });

        var cursor = state.cursor('profile');
        // 更新指定路径上的值
        assert.equal(cursor().parent.mother.name, 'nina');
        cursor.update('parent.mother.name', 'rose');
        assert.equal(cursor().parent.mother.name, 'rose');
        // 更新整个cursor对应的值
        cursor.update({name: 'monkey'});
        assert.equal(cursor().name, 'monkey');
        assert.equal(cursor.get('parent.mother.name'), undefined);
    });

    it('namespace', function () {
        var state = new State();
        state.load({
            profile: {
                name: "jack",
                age: 10,
                parent: {
                    mother: {
                        name: 'nina'
                    },
                    father: {
                        name: 'chris'
                    }
                }
            }
        });

        var ns = state.namespace('profile');
        var nameCursor = ns.cursor('name');
        var fatherCursor = ns.cursor('parent.father');

        assert.equal(nameCursor(), 'jack');
        assert.equal(fatherCursor().name, 'chris');

        // can update
        nameCursor.update('john');
        assert.equal(state.cursor('profile.name')(), 'john');
    });
});

describe('dirty check', function () {
    var state, child0Cursor, child0, child1, children, profile, _state, child1Cursor;
    beforeEach(function(){
        state = new State();
        state.load({
            profile: {
                children: [
                    {
                        name: 'jack'
                    },
                    {
                        name: 'rose'
                    }
                ]
            }
        });

        child0Cursor = state.cursor('profile.children.0');
        child1Cursor = state.cursor('profile.children.1');
        child0 = state.cursor('profile.children.0')();
        child1 = state.cursor('profile.children.1')();
        children = state.cursor('profile.children')();
        profile = state.cursor('profile')();
        _state = state._state;
    });

    it('update a cursor should make its path dirty', function () {
        assert.equal(child0Cursor().name, 'jack');
        child0Cursor.update('name', 'chris');
        assert.equal(child0Cursor().name, 'chris');

        assert.notEqual(child0Cursor(), child0);
        assert.notEqual(state.cursor('profile.children')(), children);
        assert.notEqual(state.cursor('profile')(), profile);
        assert.notEqual(state._state, _state);
        // but child1 should not change
        assert.equal(child1Cursor(), child1);
    });

    it('wont update if the value not changed', function () {
        assert.equal(child0Cursor().name, 'jack');
        child0Cursor.update('name', 'jack'); // wont update

        assert.equal(child0Cursor(), child0);
        assert.equal(state.cursor('profile.children')(), children);
        assert.equal(state.cursor('profile')(), profile);
        assert.equal(state._state, _state);
        assert.equal(child1Cursor(), child1);
    });

    it('mergeUpdate a cursor should batch update its dirty path', function () {
        var call_assign_count = 0;
        // wrap the assign function with test hook info
        var oldAssign = State.INNER_FUNC.assign;
        State.INNER_FUNC.assign = function(a, path, c, d, e) {
            // 尽管更新的两条路径上都包含prfoile，
            // 对于profile这个键上的值，只会更新一次
            if (path[path.length - 1] == 'profile') { call_assign_count++; }
            return oldAssign(a, path, c, d, e);
        }
        state.cursor('profile').mergeUpdate({
            children: {
                0: {
                    name: 'rina'
                },
                1: {
                    name: 'tina'
                }
            }
        });
        State.INNER_FUNC.assign = oldAssign;

        assert.equal(child0Cursor().name, 'rina');
        assert.equal(child1Cursor().name, 'tina');

        assert.notEqual(child0Cursor(), child0);
        assert.notEqual(state.cursor('profile.children')(), children);
        assert.notEqual(state.cursor('profile')(), profile);
        assert.notEqual(_state, state._state);

        assert.equal(call_assign_count, 1);
    });
});

describe('util function', function() {

    it('should return new object' , function () {
        var util = State.util;
        var a = [1, 5, 6, 2];

        var b = util.push(a, 10);
        assert.deepEqual(b, [1, 5, 6, 2, 10]);
        assert.deepEqual(a, [1, 5, 6, 2]);

        var b = util.pop(a);
        assert.deepEqual(b, [1, 5, 6]);
        assert.deepEqual(a, [1, 5, 6, 2]);

        var b = util.shift(a);
        assert.deepEqual(b, [5, 6, 2]);
        assert.deepEqual(a, [1, 5, 6, 2]);

        var b = util.unshift(a, 1);
        assert.deepEqual(b, [1, 1, 5, 6, 2]);
        assert.deepEqual(a, [1, 5, 6, 2]);

        var b = util.sort(a);
        assert.deepEqual(b, [1, 2, 5, 6]);
        assert.deepEqual(a, [1, 5, 6, 2]);

        var b = util.reverse(a);
        assert.deepEqual(b, [2, 6, 5, 1]);
        assert.deepEqual(a, [1, 5, 6, 2]);

        // removes 1 element from index 0, and inserts `3`
        var b = util.splice(a, 0, 1, 3);
        assert.deepEqual(b, [3, 5, 6, 2]);
        assert.deepEqual(a, [1, 5, 6, 2]);

        // removes 1 element from index 0, and inserts `3`
        var b = util.remove(a, 1);
        assert.deepEqual(b, [1, 6, 2]);
        assert.deepEqual(a, [1, 5, 6, 2]);

        var o = {name: 'jack'};
        var b = util.merge(o, {age: 13});
        assert.deepEqual(o, {name: 'jack'});
        assert.deepEqual(b, {name: 'jack', age: 13});

        var b = util.merge(o, {age: 23, name: 'john'});
        assert.deepEqual(o, {name: 'jack'});
        assert.deepEqual(b, {name: 'john', age: 23});
    });

    it('x method', function() {
        State.injectPrototype();
        var util = State.util;
        var a = [1, 5, 6, 2];

        var b = a.xpush(10);
        assert.deepEqual(b, [1, 5, 6, 2, 10]);
        assert.deepEqual(a, [1, 5, 6, 2]);

        var b = a.xpop();
        assert.deepEqual(b, [1, 5, 6]);
        assert.deepEqual(a, [1, 5, 6, 2]);

        var b = a.xshift();
        assert.deepEqual(b, [5, 6, 2]);
        assert.deepEqual(a, [1, 5, 6, 2]);

        var b = a.xunshift(1);
        assert.deepEqual(b, [1, 1, 5, 6, 2]);
        assert.deepEqual(a, [1, 5, 6, 2]);

        var b = a.xsort(a);
        assert.deepEqual(b, [1, 2, 5, 6]);
        assert.deepEqual(a, [1, 5, 6, 2]);

        var b = a.xreverse();
        assert.deepEqual(b, [2, 6, 5, 1]);
        assert.deepEqual(a, [1, 5, 6, 2]);

        // removes 1 element from index 0, and inserts `3`
        var b = a.xsplice(0, 1, 3);
        assert.deepEqual(b, [3, 5, 6, 2]);
        assert.deepEqual(a, [1, 5, 6, 2]);

        // removes 1 element from index 0, and inserts `3`
        var b = a.xremove(1);
        assert.deepEqual(b, [1, 6, 2]);
        assert.deepEqual(a, [1, 5, 6, 2]);

        var o = {name: 'jack'};
        var b = o.xmerge({age: 13});
        assert.deepEqual(o, {name: 'jack'});
        assert.deepEqual(b, {name: 'jack', age: 13});

        var b = o.xmerge({age: 23, name: 'john'});
        assert.deepEqual(o, {name: 'jack'});
        assert.deepEqual(b, {name: 'john', age: 23});
    });
});
