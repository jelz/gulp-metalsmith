var gulp = require('gulp');
var del = require('del');
var metalsmith = require('..');
var permalinks = require('metalsmith-permalinks');
var layouts = require('metalsmith-layouts');

gulp.task('default', ['metalsmith']);
gulp.task('clean', function () {
  del('build/**');
});

gulp.task('metalsmith', ['clean'], function () {
  return gulp.src('src/**')
    .pipe(metalsmith(getConfig()))
    .pipe(gulp.dest('build'));
});

gulp.task('metalsmith-json', ['clean'], function () {
  return gulp.src('json/**')
    .pipe(metalsmith.json(getConfig()))
    .pipe(gulp.dest('build'));
});

function getConfig() {
  return {
    use: [permalinks(), layouts({engine: 'swig'})],
    metadata: {site_title: 'sample static stite'}
  };
}
