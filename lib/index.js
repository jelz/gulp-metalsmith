var through = require('through2');
var gutil = require('gulp-util');
var fm = require('front-matter');
var is = require('is_js');
var extend = require('extend');
var utf8 = require('is-utf8');
var metalsmith = require('./metalsmith.js');

var PLUGIN_NAME = 'gulp-metalsmith';

vinyl_plugin.json = json_plugin;
vinyl_plugin.PLUGIN_NAME = PLUGIN_NAME;
module.exports = vinyl_plugin;

function vinyl_plugin(opts) { return plugin('vinyl', opts); }
function json_plugin(opts) { return plugin('json', opts); }

function plugin(type, opts) {
    var s = through.obj(transform, flush);
    var adders = { vinyl: add_vinyl_file, json: add_json_files };
    var files = {};
    var m;

    opts = is.object(opts) ? opts : {};
    opts.frontmatter = opts.frontmatter !== false;

    m = metalsmith(opts.root || process.cwd());
    (opts.use || []).forEach(function(plugin) { m.use(plugin); });

    return s;

    function transform(f, enc, cb) {
        if (f.isStream()) { emit_error('Streams not supported.'); }
        if (f.isBuffer()) { try { adders[type](f, enc); } catch (err) { emit_error(err); } }
        cb();
    }

    function flush(cb) {
        m.run(files, function(err, files) {
            if (err) { emit_error(err); }
            if (files) { Object.keys(files).forEach(push_file_to_stream); }
            cb();
        });
    }

    function push_file_to_stream(key) {
        var file = { path: key, contents: files[key].contents };
        s.push(new gutil.File(file));
    }

    function add_vinyl_file(f, enc) {
        var key = f.path.replace(f.base, '');

        if (utf8(f.contents)) {
            var contents = f.contents.toString(enc);
            files[key] = get_metalsmith_obj(contents);
        } else {
            files[key] = {contents: f.contents};
        }
    }

    function get_metalsmith_obj(contents) {
        if (opts.frontmatter) { return get_metalsmith_obj_with_frontmatter(contents); }
        return extend({}, { contents: new Buffer(contents) });
    }

    function get_metalsmith_obj_with_frontmatter(contents) {
        var parsed = fm(contents);
        return extend({}, parsed.attributes, { contents: new Buffer(parsed.body) });
    }

    function add_json_files(f, enc) {
        var contents = f.contents.toString(enc);
        var json_files = get_json_files(contents);
        Object.keys(json_files).forEach(function(key) {
            var item = json_files[key];
            if (!is.object(item)) { return; }
            item.contents = new Buffer(item.contents || '');
            files[key] = item;
        });
    }

    function get_json_files(contents) {
        var json_files = JSON.parse(contents);
        if (!is.object(json_files)) { throw new Error('JSON file does not contain object.'); }
        return json_files;
    }

    function emit_error(msg_or_err) {
        var plugin_err = new gutil.PluginError(PLUGIN_NAME, msg_or_err, { showStack: true });
        s.emit('error', plugin_err);
    }
}
