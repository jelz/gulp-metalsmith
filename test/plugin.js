var test = require('tape');
var gutil = require('gulp-util');
var through = require('through2');
var vinyl = require('vinyl-fs');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');

var plugin = require('..');

var base = _.partial(path.join, __dirname, 'fixtures');

function prepare(globs, opts) {
  opts = _.extend({root: base()}, opts);
  globs = _.isString(globs) ? [globs] : globs;
  globs = _.map(globs, function (glob) {
    return base(glob || '');
  });

  return vinyl.src(globs).pipe(plugin(opts));
}

function testContent(f, path, str, fn) {
  var fileMatches = f.path.substr(-path.length) === path;
  var contentMatches = _.includes(f.contents.toString(), str);

  if (fn && fileMatches && contentMatches) {
    fn();
  }
}

test('Plugin is a function that returns a stream', function (t) {
  t.ok(_.isFunction(plugin));
  var p = plugin();

  ['emit', 'on', 'pipe', 'push', 'write', 'end'].forEach(function (m) {
    t.ok(_.isFunction(p[m]));
  });
  t.end();
});

test('Plugin emits error for vinyl files of type "stream"', function (t) {
  var file = new gutil.File({contents: through.obj()});
  var s = plugin();
  t.plan(4);

  s.on('error', function (err) {
    t.ok(err instanceof gutil.PluginError);
    t.equal(err.plugin, plugin.PLUGIN_NAME);
    t.ok(_.includes(err.message, 'not supported'));
  });

  t.ok(file.isStream());
  s.end(file);
});

test('Plugin handles a stream of vinyl files of type "buffer"', function (t) {
  t.plan(3);
  prepare('*').pipe(through.obj(function (f, enc, cb) {
    testContent(f, 'index.html', 'Index page', t.pass);
    testContent(f, 'contact.html', 'Contact page', t.pass);
    cb();
  }, t.pass));
});

test('Plugin omits ignored files', function (t) {
  t.plan(6);
  prepare('*.html', {ignore: 'index.html', use: testSingle});
  prepare('*', {ignore: ['*', '!*.jpg'], use: testMultiple});

  function testSingle(files) {
    t.equal(_.values(files).length, 1);
    t.equal(files['contact.html'].title, 'Contact');
    t.notOk(files['index.html']);
  }

  function testMultiple(files) {
    t.equal(_.values(files).length, 1);
    t.ok(files['trees.jpg']);
    t.notOk(files['pc.png']);
  }
});

test('Plugin does not touch non-utf8 files', function (t) {
  t.plan(3);
  prepare('*.jpg').pipe(through.obj(function (f, enc, cb) {
    t.ok(f.isBuffer());
    t.ok(f.contents.equals(fs.readFileSync(base('trees.jpg'))));
    cb();
  }, t.pass));
});

test('Plugin accepts a single middleware function', function (t) {
  t.plan(1);
  prepare('index.html', {use: t.pass});
});

test('Plugin adds metadata items from configuration options', function (t) {
  t.plan(3);
  prepare('*.html', {
    metadata: {
      item1: true,
      item2: ['list', 'of', 'things']
    },
    use: [testMetadata]
  });

  function testMetadata(files, m, next) {
    var meta = m.metadata();
    t.ok(meta.item1);
    t.equal(meta.item2.length, 3);
    t.equal(meta.item2[2], 'things');
  }
});

test('Plugin parses frontmatter if opts.frontmatter is true', function (t) {
  t.plan(2);
  prepare('index.html').pipe(stillIncludes(false));
  prepare('contact.html', {frontmatter: false}).pipe(stillIncludes(true));

  function stillIncludes(method) {
    return through.obj(function (f, enc, cb) {
      t[method ? 'ok' : 'notOk'](_.includes(f.contents.toString(), '---'));
      cb();
    });
  }
});

test('Plugin fails when Metalsmith or middleware fails', function (t) {
  t.plan(2);
  var s = prepare('**', {use: failingMiddleware});

  s.on('error', function (err) {
    t.ok(err instanceof gutil.PluginError);
    t.equal(err.message, 'boom!');
  });

  function failingMiddleware(f, m, next) {
    next(new Error('boom!'));
  }
});

test('Plugin fails when JSON definitions are invalid', function (t) {
  t.plan(3);
  prepare('**', {json: 'json/invalid.json'}).on('error', isPluginError);
  prepare('**', {json: 'json/array.json'}).on('error', function (err) {
    isPluginError(err);
    t.ok(_.includes(err.message, 'single root object'));
  });

  function isPluginError(err) {
    t.ok(err instanceof gutil.PluginError);
  }
});

test('Plugin creates pages from JSON definitions', function (t) {
  t.plan(3);
  var s = prepare('**/*.json', {json: 'json/pages.json'});

  s.pipe(through.obj(function (f, enc, cb) {
    testContent(f, 'index.html', 'Index page', t.pass);
    testContent(f, 'contact.html', 'Contact page', t.pass);
    cb();
  }, t.pass));
});

test('Plugin merges and creates pages from multiple JSON inputs', function (t) {
  t.plan(4);
  var json = ['json/pages.json', 'json/offer_page.json'];
  var s = prepare('**/*.json', {json: json});

  s.pipe(through.obj(function (f, enc, cb) {
    testContent(f, 'index.html', 'Index page', t.pass);
    testContent(f, 'contact.html', 'Contact page', t.pass);
    testContent(f, 'offer.html', 'Offer page', t.pass);
    cb();
  }, t.pass));
});

test('Plugin converts all JSON files if opts.json is true', function (t) {
  t.plan(3);
  var globs = ['json/pages.json', 'json/*_page.json'];
  var s = prepare(globs, {json: true, use: testFiles});

  function testFiles(files) {
    t.equals(_.values(files).length, 5);
    t.ok(files['index.html']);
    t.ok(files['map.html']);
  }
});

test('Plugin handles a JSON defined page w/o contents', function (t) {
  t.plan(3);
  var s = prepare('json/empty_page.json', {json: true});

  s.pipe(through.obj(function (f, enc, cb) {
    t.equal(f.path, 'empty.html');
    t.equal(f.contents.toString(), '');
    cb();
  }, t.pass));
});

test('Plugin ignores invalid file keys in JSON definition', function (t) {
  t.plan(2);
  var s = prepare('json/map_page.json', {json: true});

  s.pipe(through.obj(function (f, enc, cb) {
    t.equal(f.path, 'map.html');
    cb();
  }, t.pass));
});
