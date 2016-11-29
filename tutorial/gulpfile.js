var gulp = require('gulp');
var del = require('del');
var markdown = require('metalsmith-markdown');
var layouts = require('metalsmith-layouts');
var contentful = require('contentful');
var fs = require('fs');

/**
 * PLEASE NOTE!

 * Don't use a parent directory ("..") as we do it
 * here for simplicity (you can clone the repo and
 * tutorial works with the current version).
 *
 * When using this library as a package installed
 * with npm, you have to require "gulp-metalsmith":
 *
 * const metalsmith = require('gulp-metalsmith');
 */
var metalsmith = require('..');

gulp.task('default', ['watch']);

gulp.task('clean', function () {
  del('build/**');
});

gulp.task('watch', function () {
  gulp.watch('src/**', ['metalsmith-json']);
});

gulp.task('metalsmith', ['clean'], function () {
  return gulp.src('src/**')
    .pipe(metalsmith({
      use: [
        markdown(),
        layouts({engine: 'swig'})
      ]
    }))
    .pipe(gulp.dest('build'));
});

gulp.task('metalsmith-json', ['clean'], function () {
  return gulp.src('src/**')
    .pipe(metalsmith({
      ignore: 'src/*.md',
      json: true,
      use: [
        markdown(),
        layouts({engine: 'swig'})
      ]
    }))
    .pipe(gulp.dest('build'));
});

gulp.task('contentful', function () {
  // Both space ID and access token can be found in the "APIs" section
  var client = contentful.createClient({
    space: '49ewbt9gbyem',
    accessToken: '4ffd55500ba0dbae29b4eefb033298f1e9f09df91d65cfb02eb480f5b33775c3'
  });

  client.getEntries({
    content_type: 'article',
    order: 'fields.order'
  }).then(function (entries) {
    var pages = preparePages(entries);
    fs.writeFileSync('src/pages.json', JSON.stringify(pages, null, 2));
  });
});

function preparePages(entries) {
  return entries.items.reduce(function (acc, item) {
    acc[item.fields.slug.replace(/\.html$/, '.md')] = {
      title: item.fields.title,
      order: item.fields.order,
      layout: 'basic.swig',
      contents: item.fields.content
    };
    return acc;
  }, {});
}
