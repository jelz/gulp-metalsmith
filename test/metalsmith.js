var test = require('tape');
var path = require('path');
var _ = require('lodash');

var metalsmith = require('../lib/metalsmith.js');

test('Metalsmith exposes a compatible API', function (t) {
  var m = metalsmith();
  var methods = [
    'build', 'source', 'destination', 'clean',
    'frontmatter', 'use', 'run', 'metadata', 'path'
  ];

  methods.forEach(function (method) {
    t.ok(_.isFunction(m[method]));
  });
  t.end();
});

test('Metalsmith throws for not implemented methods', function (t) {
  var m = metalsmith();

  metalsmith.NOT_IMPLEMENTED.forEach(function (method) {
    t.throws(m[method]);
  });
  t.end();
});

test('Metalsmith exposes a metadata getter/setter', function (t) {
  var m = metalsmith();
  var value = {test: 123, nested: {msg: 'Hello'}};
  t.deepEquals(m.metadata(), {});
  t.equal(m.metadata(value), m);
  t.equal(m.metadata(), value);
  t.deepEquals(m.metadata(), {test: 123, nested: {msg: 'Hello'}});
  t.end();
});

test('Metalsmith exposes a path getter', function (t) {
  var cwd = process.cwd();
  var m = metalsmith();
  t.equal(m.path(), cwd);
  t.equal(m.path('../hello.txt'), path.resolve(cwd, '..', 'hello.txt'));
  m = metalsmith('/tmp/metalsmith');
  t.equal(m.path(), '/tmp/metalsmith');
  t.equal(m.path('test/hello.txt'), '/tmp/metalsmith/test/hello.txt');
  t.equal(m.path('../../test.html'), '/test.html');
  t.end();
});

test('Metalsmith flows files through middleware functions', function (t) {
  var m = metalsmith();
  t.plan(3);

  m.use(function (files, m, next) {
    t.pass();
    next();
  });
  m.use(function (files, m, next) {
    t.pass();
    next();
  });

  m.run({}, t.pass);
});

test('Metalsmith passes the same files/metadata to middleware', function (t) {
  var m = metalsmith();
  t.plan(3);

  m.use(function (files, m, next) {
    files.added_file = {};
    next();
  });
  m.use(function (files, m, next) {
    m.metadata().added_metadata = 123;
    next();
  });

  m.run({}, function (err, files) {
    t.ok(_.isNull(err));
    t.ok(_.isObject(files.added_file));
    t.equal(m.metadata().added_metadata, 123);
  });
});

test('Metalsmith handles middleware errors', function (t) {
  var m = metalsmith();
  t.plan(2);

  m.use(function (files, m, next) {
    next();
  });
  m.use(function (files, m, next) {
    next(new Error('Second middleware error.'));
  });
  m.use(function (files, m, next) {
    next(new Error('Last middleware error.'));
  });

  m.run({}, function (err) {
    t.ok(_.isError(err));
    t.equal(err.message, 'Second middleware error.');
  });
});
