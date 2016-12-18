var path = require('path');
var through = require('through2');
var gutil = require('gulp-util');
var fm = require('front-matter');
var _ = require('lodash');
var utf8 = require('is-utf8');
var globby = require('globby');
var metalsmith = require('./metalsmith.js');

var PLUGIN_NAME = 'gulp-metalsmith';

plugin.PLUGIN_NAME = PLUGIN_NAME;
module.exports = plugin;

function plugin(opts) {
  var s = through.obj(transform, flush);
  var files = {};

  opts = _.isObject(opts) ? opts : {};
  opts.root = opts.root || process.cwd();
  opts.use = (_.isFunction(opts.use) ? [opts.use] : opts.use) || [];
  opts.frontmatter = opts.frontmatter !== false;
  opts.json = opts.json === true ? '**/*.json' : opts.json;

  var m = metalsmith(opts.root);
  var ignored = matchGlobs(opts.ignore, opts.root);
  var jsonDefinitions = matchGlobs(opts.json, opts.root);

  m.metadata(opts.metadata || {});
  opts.use.forEach(m.use);

  return s;

  function transform(file, enc, cb) {
    if (file.isStream()) {
      emitError('Streaming is not supported.');
    }
    else if (file.isBuffer() && !isIgnored(file)) {
      processFile(file);
    }

    cb();
  }

  function processFile(file) {
    var key = file.path.replace(file.base, '');
    var contents = file.contents;
    var newFiles = {};

    if (isJsonDefinition(file) && utf8(contents)) {
      _.extend(newFiles, createFilesFromJsonDefinition(contents.toString()));
    }
    else if (opts.frontmatter && utf8(contents)) {
      newFiles[key] = parseFrontmatter(contents.toString());
    }
    else {
      newFiles[key] = {contents: contents};
    }

    Object.keys(newFiles).forEach(function (key) {
      var clone = file.clone({contents: false});
      files[key] = _.extend(newFiles[key], {stat: file.stat, _vinyl: clone});
    });
  }

  function isIgnored(file) {
    return ignored.indexOf(file.path) > -1;
  }

  function isJsonDefinition(file) {
    return jsonDefinitions.indexOf(file.path) > -1;
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
      var file = value._vinyl || new gutil.File({stat: value.stat});
      file.path = path.join(file.base, key);
      s.push(_.extend(file, {contents: value.contents}));
    });
  }

  function createFilesFromJsonDefinition(contents) {
    try {
      return createFilesExtension(parseJsonDefinition(contents));
    } catch (err) {
      emitError(err);
      return {};
    }
  }

  function emitError(messageOrErr) {
    var opts = {showStack: true};
    var err = new gutil.PluginError(PLUGIN_NAME, messageOrErr, opts);
    s.emit('error', err);
  }
}

function matchGlobs(globs, root) {
  if (!_.isString(globs) && !_.isArray(globs)) {
    return [];
  }

  return globby.sync(globs, {cwd: root}).map(function (match) {
    return path.join(root, match);
  });
}

function parseFrontmatter(contents) {
  var parsed = fm(contents);
  var bodyBuf = new Buffer(parsed.body);
  return _.extend({contents: bodyBuf}, parsed.attributes);
}

function createFilesExtension(files) {
  return _.transform(files, function (result, value, key) {
    if (_.isPlainObject(value)) {
      value.contents = new Buffer(value.contents || '');
      result[key] = value;
    }
  }, {});
}

function parseJsonDefinition(contents) {
  var parsed = JSON.parse(contents);
  if (_.isPlainObject(parsed)) {
    return parsed;
  } else {
    throw new Error('JSON file should contain a single root object.');
  }
}
