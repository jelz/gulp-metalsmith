var test = require('tape');
var gutil = require('gulp-util');
var through = require('through2');
var vinyl = require('vinyl-fs');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');

var plugin = require('..');

var base = _.partial(path.join, __dirname, 'fixtures');
var prepare = _.partial(prepareFn, 'src');
var prepareJson = _.partial(prepareFn, 'json');

function prepareFn(dir, globs, opts) {
  var fn = dir === 'json' ? plugin.json : plugin;
  globs = _.isString(globs) ? [globs] : globs;
  globs = _.map(globs, function (glob) {
    return base(dir, glob || '');
  });

  return vinyl.src(globs).pipe(fn(opts));
}

function testContent(f, path, str, fn) {
  var fileMatches = f.path.substr(-path.length) === path;
  var contentMatches = _.includes(f.contents.toString(), str);

  if (fn && fileMatches && contentMatches) {
    fn();
  }
}

test('Plugin API', function (t) {
  t.true(_.isFunction(plugin));
  t.true(_.isFunction(plugin.json));
  t.end();
});

test('Plugin returns a stream', function (t) {
  var methods = ['emit', 'on', 'pipe', 'push', 'write', 'end'];
  var p = plugin();
  t.plan(methods.length);

  methods.forEach(function (m) {
    t.true(_.isFunction(p[m]));
  });
});

test('Failure on a file containing a stream', function (t) {
  var file = new gutil.File({contents: through.obj()});
  var s = plugin();
  t.plan(4);

  s.on('error', function (err) {
    t.true(err instanceof gutil.PluginError);
    t.equals(err.plugin, plugin.PLUGIN_NAME);
    t.true(_.includes(err.message, 'not supported'));
  });

  t.true(file.isStream());
  s.end(file);
});

test('Handle a stream of buffered vinyl files', function (t) {
  t.plan(3);
  prepare('**').pipe(through.obj(function (f, enc, cb) {
    testContent(f, 'index.html', 'Index page', t.pass);
    testContent(f, 'contact.html', 'Contact page', t.pass);
    cb();
  }, t.pass));
});

test('Do not touch non-utf8 files', function (t) {
  t.plan(6);

  prepare('*.jpg').pipe(through.obj(function (f, enc, cb) {
    t.true(f.isBuffer());
    t.true(f.contents.equals(fs.readFileSync(base('src', 'trees.jpg'))));
    cb();
  }, t.pass));

  prepareJson('*.png').pipe(through.obj(function (f, enc, cb) {
    t.true(f.isBuffer());
    t.true(f.contents.equals(fs.readFileSync(base('json', 'pc.png'))));
    cb();
  }, t.pass));
});

test('Frontmatter configuration option', function (t) {
  t.plan(2);
  prepare('index.html').pipe(stillIncludes(false));
  prepare('contact.html', {frontmatter: false}).pipe(stillIncludes(true));

  function stillIncludes(method) {
    return through.obj(function (f, enc, cb) {
      t[method ? 'true' : 'false'](_.includes(f.contents.toString(), '---'));
      cb();
    });
  }
});

test('Failure when Metalsmith fails', function (t) {
  var s = prepare('**', {
    use: [function (f, m, next) {
      next(new Error('boom!'));
    }]
  });

  t.plan(2);

  s.on('error', function (err) {
    t.true(err instanceof gutil.PluginError);
    t.equals(err.message, 'boom!');
  });
});

test('Failure on an invalid JSON', function (t) {
  t.plan(3);

  prepareJson('invalid_page.json').on('error', isPluginError);
  prepareJson('array.json').on('error', function (err) {
    isPluginError(err);
    t.true(_.includes(err.message, 'single root object'));
  });

  function isPluginError(err) {
    t.true(err instanceof gutil.PluginError);
  }
});

test('Handle JSON input', function (t) {
  t.plan(3);
  prepareJson('pages.json').pipe(through.obj(function (f, enc, cb) {
    testContent(f, 'index.html', 'Index page', t.pass);
    testContent(f, 'contact.html', 'Contact page', t.pass);
    cb();
  }, t.pass));
});

test('Handle a multi-file JSON input', function (t) {
  var s = prepareJson(['pages.json', 'offer_page.json']);
  t.plan(4);

  s.pipe(through.obj(function (f, enc, cb) {
    testContent(f, 'index.html', 'Index page', t.pass);
    testContent(f, 'contact.html', 'Contact page', t.pass);
    testContent(f, 'offer.html', 'Offer page', t.pass);
    cb();
  }, t.pass));
});

test('Handle a JSON defined page w/o contents', function (t) {
  t.plan(2);
  prepareJson('empty_page.json').pipe(through.obj(function (f) {
    t.equals(f.path, 'empty.html');
    t.equals(f.contents.toString(), '');
  }));
});

test('Ignore invalid file keys', function (t) {
  t.plan(2);
  prepareJson('map_page.json').pipe(through.obj(function (f, enc, cb) {
    t.equals(f.path, 'map.html');
    cb();
  }, t.pass));
});
