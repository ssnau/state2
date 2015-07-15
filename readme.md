State
------

一个简单的基于cursor的状态对象实现。

Example
-------

```
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
```

API
-------

###State

#### cursor(path)

- `path` 数组或字符串，表示cursor指定的路径。

返回一个cursor，永远指向state的path路径。

```
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
```

#### load(obj)

将state的内部数据更新为obj。

```
var state = new State();
state.load({name: 'jack'});
assert.equal(state.cursor('name'), 'jack');
```

#### toJS()

将state的内部数据输出为JSON对象供调试及读取。

#### on(eventName, callback)

监听事件，通常用于监听state的`change`事件。

### Cursor

#### @self()

一个cursor本身就是一个函数，调用自身将返回其游标对应的数据。

```
var state = new State();
state.load({name: 'jack'});
var cursor = state.cursor('name');
assert.equal(cursor(), 'jack');
```

### get(path)

`path`可是字符串也可是数组，表示要取值的相对路径。使用get方法是非常安全的，因为get方法并不会因为path不存在而抛出异常。

```
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
assert.equal(cursor.get('parent.mother.name'), 'nina');
// 路径不存在，直接返回undefined
// 如果写成: cursor().some.other.path 将出错。
assert.equal(cursor.get('some.other.path'), undefined);
```

### update(path, sth) 或 update(sth)

更新cursor对应路径上的值。
```
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
cursor.update('parent.mother.name', 'rose');
assert.equal(cursor().parent.mother.name, 'rose');
// 更新整个cursor对应的值
cursor.update({name: 'monkey'});
assert.equal(cursor().name, 'monkey');
assert.equal(cursor.get('parent.mother.name'), undefined);
```

