var Metalsmith = require('metalsmith');
var markdown = require('metalsmith-markdown');
var layouts = require('metalsmith-layouts');

Metalsmith(__dirname)
  .use(markdown())
  .use(layouts({engine: 'swig'}))
  .build(done);

function done(err) {
  if (err) {
    throw err;
  }
}
