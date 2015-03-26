var gulp = require('gulp');
var del = require('del');
var metalsmith = require('..');
var permalinks = require('metalsmith-permalinks');
var layouts = require('metalsmith-layouts');

gulp.task('default', ['metalsmith']);
gulp.task('clean', function() { del('build/**'); });

gulp.task('metalsmith', ['clean'], function() {
    return gulp.src('src/**').
        pipe(metalsmith({ use: get_plugins() })).
        pipe(gulp.dest('build'));
});

gulp.task('metalsmith-json', ['clean'], function() {
    return gulp.src('json/**').
        pipe(metalsmith.json({ use: get_plugins() })).
        pipe(gulp.dest('build'));
});

function get_plugins() {
    return [ permalinks(), layouts({ engine: 'swig' }) ];
}
