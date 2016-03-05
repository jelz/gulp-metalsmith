# Let me make a case for `gulp-metalsmith`

You are working as a developer for Foo Solutions, a company that specializes in
highly available computing services. Unfortunately company's website is backed
by a popular PHP blogging platform. It takes in average 1650ms for the page to
load for the first time. And the last Friday it was hacked...


## Time to go static

A static website is just a bunch of assets like HTML/CSS/JS files, images,
videos/music and fonts. These are things that we can send to end-users very
efficiently. And there's no admin panel that can be hacked.

You've researched the topic and found out that [metalsmith][1] is a viable tool
for static site generation. Your copywriter prepared contents for the new
website, written down using [Markdown][2]. It's enough to code
([full source][3]):

```js
Metalsmith(__dirname)
  .use(markdown())
  .use(layouts({engine: 'swig'}))
  .build(done);
```

It takes Markdown sources (like [index.md][4]), convert it to HTML and then wrap
it with specified layout. In the `build` directory we can find a set of assets
ready to be deployed.


## You're missing gulp... ;-(

You used [gulp][5] for in your previous project and it feels like a waste of
time to move well-covered tasks like file watching, compiling styles or gzipping
the outcome.
 
## `gulp-metalsmith` comes to the rescue

`gulp-metalsmith` is a lightweight plugin for **gulp** that incorporates
Metalsmith builds into gulp pipelines. Our example above can be rewritten like
this ([full source][6]):

```js
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
```


[1]: https://github.com/metalsmith/metalsmith
[2]: https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet
[3]: ./metalsmith-build.js
[4]: ./src/index.md
[5]: http://gulpjs.com/
[6]: ./gulpfile.js
