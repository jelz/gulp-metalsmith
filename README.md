# gulp-metalsmith

[![npm](https://img.shields.io/npm/v/gulp-metalsmith.svg)](https://www.npmjs.com/package/gulp-metalsmith)
[![Build Status](https://travis-ci.org/jelz/gulp-metalsmith.svg)](https://travis-ci.org/jelz/gulp-metalsmith)
[![Code Coverage](https://codecov.io/github/jelz/gulp-metalsmith/coverage.svg?branch=master)](https://codecov.io/github/jelz/gulp-metalsmith?branch=master)
[![npm](https://img.shields.io/npm/dt/gulp-metalsmith.svg)](https://www.npmjs.com/package/gulp-metalsmith)
[![Dependency Status](https://david-dm.org/jelz/gulp-metalsmith.svg)](https://david-dm.org/jelz/gulp-metalsmith)
[![devDependency Status](https://david-dm.org/jelz/gulp-metalsmith/dev-status.svg)](https://david-dm.org/jelz/gulp-metalsmith#info=devDependencies)


## API changes!

Please note that as of v1.0.0 `metalsmith.json()` method is not available. Use
the [`json` configuration option](#use-it-with-json) instead.


## Tutorial

This README file doesn't make sense at first glance or is too technical? **See
[the `gulp-metalsmith` tutorial](./tutorial)**!


## About 

`gulp-metalsmith` is a [gulp](https://github.com/gulpjs/gulp) plugin that
incorporates [Metalsmith](http://www.metalsmith.io) builds into gulp pipelines.
It aims to be as lightweight as possible. It is shipped with an API-compatible
Metalsmith replacement that can reuse Metalsmith plugins. It can be [fed with
JSON files containing page definitions](#use-it-with-json).

After build `gulp-metalsmith` streams out `vinyl`files. The main difference
between the bundled Metalsmith and the normal Metalsmith is that it does not
perform any disc read/write operations, leaving it to `gulp`.


## Installation

```sh
$ npm install --save-dev gulp-metalsmith
```


## Usage

The simplest build task (just copies all files from `src/` to `build/`):

```js
const gulp = require('gulp');
const metalsmith = require('gulp-metalsmith');

gulp.task('metalsmith', function() {
  return gulp.src('src/**')
    .pipe(metalsmith())
    .pipe(gulp.dest('build'));
});
```

All options:

```js
const gulp = require('gulp');
const metalsmith = require('gulp-metalsmith');

gulp.src('src/**').pipe(metalsmith({
  // Metalsmith's root directory, for example for locating templates, defaults to CWD
  root: __dirname,
  // Files to exclude from the build
  ignore: ['src/*.tmp'],
  // Parsing frontmatter, defaults to true
  frontmatter: true,
  // Metalsmith plugins to use:
  use: [
    markdown(),
    layouts({engine: 'swig'})
  ],
  // Initial Metalsmith metadata, defaults to {}
  metadata: {
    site_title: 'Sample static site'
  },
  // List of JSON files that contain page definitions
  // true means "all JSON files", see the section below
  json: ['src/pages.json']
}));
```


## Use it with JSON

Given the file `src/pages.json`:

```js
{
  "index.html": {
    "title": "Homepage",
    "layout": "basic.swig",
    "contents": "<p>In euismod eleifend nunc ac pretium...</p>"
  },
  "contact.html": {
    "title": "Contact",
    "layout": "basic.swig",
    "contents": "<p>Lorem ipsum dolor sit amet...</p>"
  }
}
```

You can do this:

```js
gulp.src('src/**').pipe(metalsmith({
  use: [layouts({engine: 'swig'})],
  json: true
}));
```

This way your Metalsmith build will contain two additional files, `index.html`
and `contact.html`. The source file `pages.json` won't be included. Following
rules apply:

- be default all JSON files in the pipeline are included "as is"
- when the `json` configuration options is set to `true`, all JSON files are
  parsed and replaced with files defined in their content
- when the `json` configuration option is a glob string or an array of globs,
  only JSON files matching these globs are parsed and define new files. The rest
  of JSON files is passed "as is"


## Author

[Jakub Elżbieciak](https://elzbieciak.pl) /
[@jelzbieciak](https://twitter.com/jelzbieciak)


## License

MIT
