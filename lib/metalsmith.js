var path = require('path');
var Ware = require('ware');

var METALSMITH_STUB_METHODS = ['source', 'destination', 'clean', 'frontmatter'];

module.exports = create_metalsmith;

function create_metalsmith(d) {
    var ware = new Ware();
    var dir = d;
    var m = {};
    var metadata = {};

    METALSMITH_STUB_METHODS.forEach(function(k) { m[k] = just_chain; });
    m.use = use;
    m.build = build;
    m.run = run;
    m.metadata = get_set_metadata;
    m.path = get_path;

    return m;

    function just_chain() { return m; }
    function use(plugin) { ware.use(plugin); return m; }
    function run(files, cb) { ware.run(files, m, cb); }
    function build(cb) { cb(null, []); }

    function get_set_metadata(val) {
        if (!val) { return metadata; }
        metadata = val;
        return m;
    }

    function get_path() {
        var paths = Array.prototype.slice.call(arguments);
        if (dir) { paths.unshift(dir); }
        return path.resolve.apply(path, paths);
    }
}
