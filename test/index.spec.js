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
});

