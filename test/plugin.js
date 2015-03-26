var test = require('tape');
var is = require('is_js');
var gutil = require('gulp-util');
var through = require('through2');
var vinyl = require('vinyl-fs');
var path = require('path');

var plugin = require('..');

var base = path.join(__dirname, 'fixtures');
var content_tests = [
    { file: 'index.html', text: 'Index page' },
    { file: 'contact.html', text: 'Contact page' }
];

function base_src(p) { return path.join(base, 'src', p || ''); }
function base_json(p) { return path.join(base, 'json', p || ''); }

function test_file_content(f, enc, i) {
    return f.isBuffer() && is.include(f.path, i.file) && is.include(f.contents.toString(enc), i.text);
}

test('Plugin API', function(t) {
    t.true(is.function(plugin));
    t.true(is.function(plugin.json));
    t.end();
});

test('Return object with through2 API', function(t) {
    var methods = ['emit', 'on', 'pipe', 'push', 'write', 'end'];
    var p = plugin();
    t.plan(methods.length);
    methods.forEach(function(m) { t.true(is.function(p[m])); });
});

test('Fail on stream', function(t) {
    var file = new gutil.File({ contents: through.obj() });
    var s = plugin();
    s.on('error', function(err) {
        t.true(err instanceof gutil.PluginError);
        t.equal(err.plugin, plugin.PLUGIN_NAME);
        t.true(is.include(err.message, 'not supported'));
    });

    t.plan(4);
    t.true(file.isStream());
    s.end(file);
});

test('Handle file buffer vinyl stream', function(t) {
    t.plan(2);
    vinyl.src(base_src('**')).pipe(plugin()).pipe(through.obj(function(f, enc, cb) {
        content_tests.forEach(function(i) { if (test_file_content(f, enc, i)) { t.pass(); }});
        cb();
    }));
});

test('Frontmatter config', function(t) {
    t.plan(2);
    vinyl.src(base_src('index.html')).pipe(plugin()).pipe(test_stream('false'));
    vinyl.src(base_src('contact.html')).pipe(plugin({ frontmatter: false })).pipe(test_stream('true'));

    function test_stream(method) {
        return through.obj(function(f, enc) {
            t[method](is.include(f.contents.toString(enc), '---'));
        });
    }
});

test('Fail on invalid JSON', function(t) {
    var s = plugin.json();
    s.on('error', function(err) {
        t.true(err instanceof gutil.PluginError);
        t.equal(err.plugin, plugin.PLUGIN_NAME);
    });

    t.plan(2);
    vinyl.src(base_json('invalid_page.json')).pipe(s);
});

test('Handle JSON input', function(t) {
    t.plan(2);
    vinyl.src(base_json('pages.json')).pipe(plugin.json()).pipe(through.obj(function(f, enc, cb) {
        content_tests.forEach(function(i) { if (test_file_content(f, enc, i)) { t.pass(); }});
        cb();
    }));
});

test('Handle JSON input from multiple files', function(t) {
    var globs = [ base_json('pages.json'), base_json('offer_page.json') ];
    t.plan(3);
    vinyl.src(globs).pipe(plugin.json()).pipe(through.obj(function(f, enc, cb) {
        t.pass(); cb();
    }));
});

test('Handle JSON w/o contents', function(t) {
    t.plan(1);
    vinyl.src(base_json('empty_page.json')).pipe(plugin.json()).pipe(through.obj(function(f, enc) {
        t.equal(f.contents.toString(enc), '');
    }));
});

test('Ignore invalid file keys', function(t) {
    t.plan(1);
    vinyl.src(base_json('map_page.json')).pipe(plugin.json()).pipe(through.obj(function() {
        t.pass();
    }));
});
