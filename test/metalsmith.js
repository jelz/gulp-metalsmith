var test = require('tape');
var _ = require('lodash');
var metalsmith = require('../lib/metalsmith.js');

test('Metalsmith API', function(t) {
    var methods = ['build', 'source', 'destination', 'clean', 'frontmatter', 'use', 'run', 'metadata', 'path'];
    var m = metalsmith();
    t.plan(methods.length);
    methods.forEach(function(k) { t.true(_.isFunction(m[k])); });
});

test('Setter chaining', function(t) {
    var methods = ['source', 'destination', 'clean', 'frontmatter', 'metadata'];
    var m = metalsmith();
    t.plan(methods.length);
    methods.forEach(function(k) { t.equal(m, m[k]({})); });
});

test('Metadata get/set', function(t) {
    var m = metalsmith();
    var value = { test: 123, nested: { msg: 'Hello' } };
    t.deepEqual(m.metadata(), {});
    t.equal(m.metadata(value), m);
    t.equal(m.metadata(), value);
    t.deepEqual(m.metadata(), { test: 123, nested: { msg: 'Hello' } });
    t.end();
});

test('Build stub method', function(t) {
    var m = metalsmith();
    t.plan(2);
    m.build(function(err, files) {
        t.true(_.isNull(err));
        t.equal(files.length, 0);
    });
});

test('Path getter', function(t) {
    var m = metalsmith();
    t.equal(m.path(), process.cwd());
    t.equal(m.path('../hello.txt'), require('path').resolve(process.cwd(), '..', 'hello.txt'));
    m = metalsmith('/tmp/metalsmith');
    t.equal(m.path(), '/tmp/metalsmith');
    t.equal(m.path('test/hello.txt'), '/tmp/metalsmith/test/hello.txt');
    t.equal(m.path('../../test.html'), '/test.html');
    t.end();
});

test('Use flow', function(t) {
    var m = metalsmith();
    t.plan(3);
    m.use(function(files, m, next) { t.pass(); next(); });
    m.use(function(files, m, next) { t.pass(); next(); });
    m.run({}, function() { t.pass(); });
});

test('Run middlewares', function(t) {
    var m = metalsmith();
    t.plan(3);
    m.use(function(files, m, next) { files.added_file = {}; next(); });
    m.use(function(files, m, next) { m.metadata().added_metadata = 123; next(); });
    m.run({}, function(err, files) {
        t.true(_.isNull(err));
        t.true(_.isObject(files.added_file));
        t.equal(m.metadata().added_metadata, 123);
    });
});

test('Middleware errors', function(t) {
    var m = metalsmith();
    t.plan(2);
    m.use(function(f, m, cb) { cb(); });
    m.use(function(f, m, cb) { cb(new Error('Second middleware error.')); });
    m.use(function(f, m, cb) { cb(new Error('Last middleware error.')); });
    m.run({}, function(err) {
        t.true(_.isError(err));
        t.equal(err.message, 'Second middleware error.');
    });
});
