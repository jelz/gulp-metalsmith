var test = require('tape');
var gutil = require('gulp-util');
var through = require('through2');
var vinyl = require('vinyl-fs');
var isVinylFile = require('vinyl').isVinyl;
var pm = require('path');
var fs = require('fs');
var _ = require('lodash');

var plugin = require('..');

function base(path) {
  return pm.join(__dirname, 'fixtures', path || '');
}

function read(path) {
  return fs.readFileSync(base(path));
}

function prepare(globs, opts) {
  opts = _.extend({root: base()}, opts);
  globs = _.isString(globs) ? [globs] : globs;
  globs = _.map(globs, base);

  return vinyl.src(globs).pipe(plugin(opts));
}

function testContent(f, path, str, fn) {
  var fileMatches = f.path.substr(-path.length) === path;
  var contentMatches = _.includes(f.contents.toString(), str);

  if (_.isFunction(fn) && fileMatches && contentMatches) {
    fn();
  }
}

test('Plugin is a function that returns a stream', function (t) {
  t.ok(_.isFunction(plugin));
  var p = plugin();

  ['emit', 'on', 'pipe', 'push', 'write', 'end'].forEach(function (method) {
    t.ok(_.isFunction(p[method]));
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

test('Plugin returns file path and base as it found it', function (t) {
  t.plan(2);
  var initialPath = '/path/to/file.html';
  var initialBase = '/path/to/';
  var file = new gutil.File({
    path: initialPath,
    base: initialBase,
    contents: new Buffer('content')
  });
  var s = plugin();

  s.on('data', function (file) {
    t.equals(initialPath, file.path);
    t.equals(initialBase, file.base);
  });

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

test('Plugin omits ignored files defined in opts.ignore', function (t) {
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

test('Plugin does not touch non-UTF8 files', function (t) {
  t.plan(3);
  prepare('*.jpg').pipe(through.obj(function (f, enc, cb) {
    t.ok(f.isBuffer());
    t.ok(f.contents.equals(read('trees.jpg')));
    cb();
  }, t.pass));
});

test('Plugin accepts a single middleware function', function (t) {
  t.plan(1);
  prepare('index.html', {use: t.pass});
});

test('Plugin passes stat object to middleware functions', function (t) {
  t.plan(2);
  prepare('index.html', {use: testStat});

  function testStat(files) {
    var stat = files['index.html'].stat;
    t.ok(stat instanceof fs.Stats);
    t.ok(stat.isFile());
  }
});

test('Plugin creates new vinyl file if middleware lost reference', function (t) {
  t.plan(4);
  var vinyl = null;

  prepare('index.html', {use: badMiddleware}).on('data', function (file) {
    t.notEqual(vinyl, null);
    t.notEqual(file, vinyl);
    t.ok(isVinylFile(file));
  });

  function badMiddleware(files) {
    var file = files['index.html'];
    vinyl = file._vinyl;
    t.ok(isVinylFile(file._vinyl));
    delete file._vinyl;
  }
});

test('x', function (t) {
  t.plan(1);
  prepare('index.html', {use: rename}).on('data', function (file) {
    t.equal(file.path.replace(file.base, ''), 'home.html');
  });

  function rename(files) {
    files['home.html'] = files['index.html'];
    delete files['index.html'];
  }
});

test('Plugin adds metadata items from opts.metadata', function (t) {
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

test('Plugin does not touch JSON files if are not definitions', function (t) {
  t.plan(3);
  prepare('**', {use: testJson});

  function testJson(files) {
    t.ok(files['json/invalid.json']);
    t.ok(files['json/pages.json']);
    t.ok(files['json/pages.json'].contents.equals(read('json/pages.json')));
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

test('Plugin uses stat of JSON file for all pages created of it', function (t) {
  t.plan(2);
  prepare('json/pages.json', {
    json: true,
    use: function (f) {
      t.ok(f['index.html'].stat instanceof fs.Stats);
      t.ok(f['index.html'].stat === f['contact.html'].stat);
    }
  });
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

test('Plugin mixes both regular and JSON defined files', function (t) {
  t.plan(5);
  var globs = ['*.html', 'json/map_page.json'];
  var s = prepare(globs, {json: 'json/*.json', use: testFiles});

  function testFiles(files) {
    t.equal(_.values(files).length, 3);
    t.ok(files['index.html']);
    t.ok(files['index.html'].contents.toString().indexOf('Index') > -1);
    t.ok(files['map.html']);
    t.equal(files['map.html'].contents.toString(), '<h2>Map page</h2>');
  }
});

test('Plugin converts all JSON files if opts.json is true', function (t) {
  t.plan(3);
  var globs = ['json/pages.json', 'json/*_page.json'];
  var s = prepare(globs, {json: true, use: testFiles});

  function testFiles(files) {
    t.equal(_.values(files).length, 5);
    t.ok(files['index.html']);
    t.ok(files['map.html']);
  }
});

test('Plugin handles a JSON defined page w/o contents', function (t) {
  t.plan(3);
  var s = prepare('json/empty_page.json', {json: true});

  s.pipe(through.obj(function (f, enc, cb) {
    t.equal(f.path.replace(f.base, ''), 'empty.html');
    t.equal(f.contents.toString(), '');
    cb();
  }, t.pass));
});

test('Plugin ignores invalid file keys in JSON definition', function (t) {
  t.plan(2);
  var s = prepare('json/map_page.json', {json: true});

  s.pipe(through.obj(function (f, enc, cb) {
    t.equal(f.path.replace(f.base, ''), 'map.html');
    cb();
  }, t.pass));
});
