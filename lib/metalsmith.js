var path = require('path');
var Ware = require('ware');
var _ = require('lodash');

var NOT_IMPLEMENTED = [
  'build',
  'source',
  'destination',
  'clean',
  'frontmatter'
];

createMetalsmithInstance.NOT_IMPLEMENTED = NOT_IMPLEMENTED;
module.exports = createMetalsmithInstance;

function createMetalsmithInstance(dir) {
  var ware = new Ware();
  var metadata = {};

  var instance = _.transform(NOT_IMPLEMENTED, function (acc, method) {
    acc[method] = doNotCall(method);
  }, {});

  return _.extend(instance, {
    use: use,
    run: run,
    metadata: getOrSetMetadata,
    path: getPath
  });

  function doNotCall(method) {
    return function () {
      throw new Error('"' + method + '" method is not implemented.');
    };
  }

  function use(plugin) {
    ware.use(plugin);
    return instance;
  }

  function run(files, cb) {
    ware.run(files, instance, cb);
  }

  function getOrSetMetadata(value) {
    if (!value) {
      return metadata;
    }
    metadata = value;
    return instance;
  }

  function getPath() {
    var paths = Array.prototype.slice.call(arguments);
    if (dir) {
      paths.unshift(dir);
    }
    return path.resolve.apply(path, paths);
  }
}
