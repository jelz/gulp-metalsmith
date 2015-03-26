# gulp-metalsmith

`gulp-metalsmith` is a [gulp](https://github.com/gulpjs/gulp) plugin that incorporates [Metalsmith](http://www.metalsmith.io) builds into gulp pipelines. It aims to be as lightweight as possible. It ships with Metalsmith's replacement that has compatible API (can reuse Metalsmith plugins) and is able to recive JavaScript object containing page definitions. After build, it streams out `vinyl` files. The main difference between bundled Metalsmith and normal Metalsmith is that it does not perform any disc read/write operations, leaving it out to `gulp`.

`gulp-metalsmith` can be feed with specially formatted JSON. It allows building static pages using content providers, like [prismic.io](https://prismic.io) or [Contentful](https://www.contentful.com).

### Installation

```sh
$ npm install --save-dev gulp-metalsmith
```

### Use it with gulp

The simplest build task (just copies all files from `src/` to `build/`):
```js
gulp.task('metalsmith', ['clean'], function() {
    return gulp.src('src/**').
        pipe(metalsmith()).
        pipe(gulp.dest('build'));
});
```

All options:
```js
s.pipe(metalsmith({
    // set Metalsmith's root directory, for example for locating templates, defaults to CWD
    root: __dirname, 
    // read frontmatter, defaults to true
    frontmatter: true,
    // Metalsmith plugins to use
    use: [ permalinks(), layouts({ engine: 'swig' }) ]
}));
```

### Feed it with JSON

Given the file `src/pages.json`:
```json
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
gulp.task('metalsmith-json', ['clean'], function() {
    return gulp.src('src/pages.json').
        pipe(metalsmith({ use: [ layouts({ engine: 'swig' }) ])).
        pipe(gulp.dest('build'));
});
```

Multiple JSON files (`*.json`) are also accepted.

### Examples, tests

Examples are stored in `example/`. Tests can be run using `tape` (you probably just need to type `faucet` in the project's root directory).

### Author

[Jakub Elżbieciak](https://elzbieciak.pl)

### License

MIT
