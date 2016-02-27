var test = require('tape');
var path = require('path');
var _ = require('lodash');

var metalsmith = require('../lib/metalsmith.js');

test('Metalsmith-compatible API', function (t) {
  var API = [
    'build',
    'source',
    'destination',
    'clean',
    'frontmatter',
    'use',
    'run',
    'metadata',
    'path'
  ];

  var m = metalsmith();
  t.plan(API.length);

  API.forEach(function (method) {
    t.true(_.isFunction(m[method]));
  });
});

test('Not implemented methods', function (t) {
  var m = metalsmith();
  var NOT_IMPLEMENTED = metalsmith.NOT_IMPLEMENTED;
  t.plan(NOT_IMPLEMENTED.length);

  NOT_IMPLEMENTED.forEach(function (method) {
    t.throws(m[method]);
  });
});

test('Metadata getter/setter', function (t) {
  var m = metalsmith();
  var value = {test: 123, nested: {msg: 'Hello'}};
  t.deepEquals(m.metadata(), {});
  t.equals(m.metadata(value), m);
  t.equals(m.metadata(), value);
  t.deepEquals(m.metadata(), {test: 123, nested: {msg: 'Hello'}});
  t.end();
});

test('Path getter', function (t) {
  var cwd = process.cwd();
  var m = metalsmith();
  t.equals(m.path(), cwd);
  t.equals(m.path('../hello.txt'), path.resolve(cwd, '..', 'hello.txt'));
  m = metalsmith('/tmp/metalsmith');
  t.equals(m.path(), '/tmp/metalsmith');
  t.equals(m.path('test/hello.txt'), '/tmp/metalsmith/test/hello.txt');
  t.equals(m.path('../../test.html'), '/test.html');
  t.end();
});

test('Middleware flow', function (t) {
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

  m.run({}, function () {
    t.pass();
  });
});

test('Running middleware functions', function (t) {
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
    t.true(_.isNull(err));
    t.true(_.isObject(files.added_file));
    t.equals(m.metadata().added_metadata, 123);
  });
});

test('Handling middleware errors', function (t) {
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
    t.true(_.isError(err));
    t.equals(err.message, 'Second middleware error.');
  });
});
