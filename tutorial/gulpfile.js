var gulp = require('gulp');
var del = require('del');
var metalsmith = require('..');
var markdown = require('metalsmith-markdown');
var layouts = require('metalsmith-layouts');

gulp.task('default', ['metalsmith']);
gulp.task('clean', function () {
  del('build/**');
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
