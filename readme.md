State
------

[![Build Status](http://castle.sankuai.com/api/badge/liuxijin/state)](http://castle.sankuai.com/gh/liuxijin/state)

一个简单的Immutable Structure实现，通过cursor来获取和修改其内容。具体可见：http://wiki.sankuai.com/pages/viewpage.action?pageId=199299387

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
var nameCursor = state.cursor(['name']);
var profileCursor = state.cursor(['profile']);
var genderCursor = state.cursor(['profile', 'gender']);
 
// 通过调用cursor函数得到cursor对应的值
assert.equal(nameCursor(), 'jack');
assert.equal(genderCursor(), 'gender');
 
// 通过调用cursor的update方法，更新其对应值
nameCursor.update('john');
 
// 如果只想更新其部分值，可传入回调。
// 回调的参数是cursor对应的值，应当返回一个与之相对应拷贝。
profileCursor.update(function(profile) {
      return profile.set('gender', 'female');
});
 
// 能过调用cursor函数获得已经更新的值
assert.equal(nameCursor(), 'john');
assert.equal(genderCursor(), 'female');
```

API
-------

###State

#### cursor(path, [defaultValue])

- `path` 数组或字符串，表示cursor指定的路径。
- `defaultValue`，可选参数，表示如果这个路径没有值的话，就赋上defaultValue

返回一个cursor，永远指向state的path路径。

#### load(obj)

将state的内部数据更新为obj。注：obj会被转成Immutable Data.

#### set(obj)

将state的内部数据更新为obj, obj不会被转成Immutable Data，且最后会触发state的`change`事件。

#### toJS()

将state的内部数据转换为JSON对象供调试及读取。

#### on(eventName, callback)

监听事件，通常用于监听state的`change`事件。

### Cursor

#### @cursor()

一个cursor本身就是一个函数，调用自身将返回其游标对应的数据。

### get(path)

`path`可是字符串也可是数组，表示要取值的相对路径。

### update(sth)

- `sth` 任意值或函数。
  * 当`sth`不是函数时，cursor指向的值将被更新为`sth`，最后会触发state的`change`事件。
  * 当`sth`是一个函数时，sth的第一个参数则是cursor指向的值，cursor指向的值最后将被更新为sth返回的值，最后触发state的`change`事件。

