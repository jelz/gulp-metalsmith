var through = require('through2');
var gutil = require('gulp-util');
var fm = require('front-matter');
var _ = require('lodash');
var utf8 = require('is-utf8');
var metalsmith = require('./metalsmith.js');

var PLUGIN_NAME = 'gulp-metalsmith';
var TYPE_VINYL = 'vinyl';
var TYPE_JSON = 'json';

var plugin = _.partial(pluginFn, TYPE_VINYL);
plugin.json = _.partial(pluginFn, TYPE_JSON);
plugin.PLUGIN_NAME = PLUGIN_NAME;

module.exports = plugin;

function pluginFn(type, opts) {
  var s = through.obj(transform, flush);
  var add = type === TYPE_JSON ? addJsonDefinedFiles : addVinylFile;
  var files = {};

  opts = _.isObject(opts) ? opts : {};
  opts.frontmatter = opts.frontmatter !== false;

  var m = metalsmith(opts.root || process.cwd());
  (opts.use || []).forEach(m.use);
  m.metadata(opts.metadata || {});

  return s;

  function transform(file, enc, cb) {
    if (file.isStream()) {
      emitError('Streaming is not supported.');
    }

    if (file.isBuffer()) {
      var key = file.path.replace(file.base, '');
      var contents = file.contents;
      add(key, contents);
    }

    cb();
  }

  function flush(cb) {
    m.run(files, function (err, transformed) {
      if (err) {
        emitError(err);
      } else {
        pushToStream(transformed);
      }

      cb();
    });
  }

  function pushToStream(transformed) {
    _.forOwn(transformed, function (value, key) {
      s.push(new gutil.File({path: key, contents: value.contents}));
    });
  }

  function addVinylFile(key, contents) {
    if (opts.frontmatter && utf8(contents)) {
      var parsed = fm(contents.toString());
      var bodyBuf = new Buffer(parsed.body);
      files[key] = _.extend({contents: bodyBuf}, parsed.attributes);
    } else {
      files[key] = {contents: contents};
    }
  }

  function addJsonDefinedFiles(key, contents) {
    if (!utf8(contents)) {
      files[key] = {contents: contents};
      return;
    }

    var parsed = {};

    try {
      parsed = JSON.parse(contents.toString());
    } catch (err) {
      emitError(err);
    }

    if (!_.isPlainObject(parsed)) {
      emitError('JSON file should contain a single root object.');
    }

    _.forOwn(parsed, function (value, key) {
      if (_.isObject(value)) {
        value.contents = new Buffer(value.contents || '');
        files[key] = value;
      }
    });
  }

  function emitError(messageOrErr) {
    var opts = {showStack: true};
    var err = new gutil.PluginError(PLUGIN_NAME, messageOrErr, opts);
    s.emit('error', err);
  }
}
