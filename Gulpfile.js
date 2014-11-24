//All Requires
var gulp = require('gulp'),
    autoprefixer = require('gulp-autoprefixer'),
    minifycss = require('gulp-minify-css'),
    jshint = require('gulp-jshint'),
    uglify = require('gulp-uglify'),
    csslint = require('gulp-csslint'),
    rename = require('gulp-rename'),
    concat = require('gulp-concat'),
    notify = require('gulp-notify'),
    cache = require('gulp-cache'),
    livereload = require('gulp-livereload'),
    open = require('open'),
    del = require('del'),
    http = require('http'),
    ecstatic = require('ecstatic'),
    util = require('gulp-util'),
    prettify = require('gulp-prettify'),
    extender = require('./gulp/extensions/gulp-html-extend'),
    stylus = require('gulp-stylus'),
    include = require('gulp-include'),
    merge2 = require('merge2'),
    fs = require('fs'),
    path = require('path');
    //config = require('./gulp/config');



/* Tasks (will be extracted to separated files) */

//Style task
gulp.task('style', function(){
  //Sideshow's main stylesheet
  gulp.src('stylesheets/sideshow.styl')
  .pipe(stylus())
  .on('error', errorHandler('sideshow_stylesheet_compiling_error'))
  .pipe(autoPrefixerConfig())
  .on('error', errorHandler('sideshow_stylesheet_autoprefixing_error'))
  .pipe(rename('sideshow.css'))
  .pipe(gulp.dest('tmp'))
  .pipe(csslint('.csslintrc'))
  .pipe(csslint.reporter())
  .pipe(rename({suffix: '.min'}))
  .pipe(minifycss())
  .pipe(gulp.dest('distr/stylesheets'));

  //Font face stylesheet
  gulp.src('stylesheets/sideshow-fontface.styl')
  .pipe(stylus())
  .on('error', errorHandler('fontface_stylesheet_compiling_error'))
  .pipe(autoPrefixerConfig())
  .on('error', errorHandler('fontface_stylesheet_autoprefixing_error'))
  .pipe(rename('sideshow-fontface.min.css'))
  .pipe(minifycss())
  .pipe(gulp.dest('distr/fonts'));
});

//Examples pages Style task
gulp.task('examples-style', function(){
  gulp.src('examples/stylesheets/styl/example.styl')
  .pipe(stylus())
  .on('error', errorHandler('examples_stylesheet_compiling_error'))
  .pipe(autoPrefixerConfig())
  .on('error', errorHandler('examples_stylesheet_autoprefixing_error'))
  .pipe(rename('example.css'))
  .pipe(gulp.dest('tmp'))
  .pipe(csslint('.csslintrc'))
  .pipe(csslint.reporter())
  .pipe(rename({suffix: '.min'}))
  .pipe(minifycss())
  .pipe(gulp.dest('examples/stylesheets'));
});

//Compiles the partials for the Examples Pages
gulp.task('examples-partials', function(){
  gulp.src('examples/partials/*.html')
  .pipe(extender())
  .pipe(prettify({indent_size: 4}))
  .pipe(gulp.dest('./examples'));
});

//Bundle Nexit modules with Browserify
gulp.task('bundle-scripts', function(){
  gulp.src('./src/main.js')
  .pipe(include())
  .on('error', errorHandler('jsbuild_error'))
  .pipe(rename('sideshow.js'))
  .pipe(gulp.dest('distr/'))
  .pipe(rename({suffix: '.min'}))
  .pipe(uglify())
  .pipe(gulp.dest('./distr/'))
  .on('end', function(){
    //adding copyright message in the expanded version
    gulp.src(['./src/copyright_info.js', './distr/sideshow.js'])
    .pipe(concat('sideshow.js'))
    .pipe(gulp.dest('./distr/'));

    //adding copyright message in the minified version
    gulp.src(['./src/copyright_info.js', './distr/sideshow.min.js'])
    .pipe(concat('sideshow.min.js'))
    .pipe(gulp.dest('./distr/'));
  });
});


//Clean task
gulp.task('clean', function(cb) {
  del(['distr/*.js', 'tmp/*', 'docs/**/*'], cb);
});

//Watch Task
gulp.task('watch', function() {
  gulp.watch('src/**/*.js', ['bundle-scripts']);
  gulp.watch('stylesheets/**/*.styl', ['style', 'examples-style']);
  gulp.watch('examples/stylesheets/styl/**/*.styl', ['examples-style']);
  gulp.watch('examples/partials/**/*.html', ['examples-partials']);

  // Create LiveReload server
  livereload.listen();

  // Watch any files in distr/, reload on change
  gulp.watch(['examples/stylesheets/example.min.css', 'distr/**']).on('change', function(){
    livereload.changed();
    notify('Changed.');
  });

  notify('Running livereload.');
});


var webserverPort = 8080;

//Webserver task
gulp.task('webserver', function(){
  http.createServer(
    ecstatic({ root: __dirname })
  ).listen(webserverPort);

  notify('Web server started. Listening on port ' + webserverPort + '.');
});

//Open-browser task
function openInBrowser(browser){
  function go(browser){
    return open('http://localhost:' + webserverPort + '/example.html', browser);
  }

  if (browser != 'none'){
    if(browser == 'all'){
      go('firefox');
      go('opera');
      go('safari');
      go('chrome');  
    } else if (browser) 
      go(browser);
    else
      go('firefox');
  }
}

//Default task
gulp.task('default', function() {
  gulp.start('style');
  gulp.start('examples-style');
  gulp.start('examples-partials');
  gulp.start('webserver');
  gulp.start('watch');

  setTimeout(function(){
    openInBrowser(util.env.browser);
  }, 3000);
});

gulp.task('update-version', function(){
  var version = util.env.version || (function(){ throw "A version number must be passed. Please inform the '--version' argument."; })(),
      name = util.env.name || (function(){ throw "A version name must be passed. Please inform the '--name' argument."; })(),
      appRoot = path.resolve('.'),
      versionFilePath = path.join(appRoot, 'VERSION'),
      yuidocFilePath = path.join(appRoot, 'yuidoc.json'),
      gemspecFilePath = path.join(appRoot, 'sideshow.gemspec'),
      packageJsonFilePath = path.join(appRoot, 'package.json'),
      changelogFilePath = path.join(appRoot, 'CHANGELOG.md'),
      copyrightInfoFilePath = path.join(appRoot, 'src', 'copyright_info.js'),
      variablesFilePath = path.join(appRoot, 'src', 'general', 'variables.js'),
      releaseDate = new Date().toISOString().slice(0,10);

  //VERSION file
  fs.readFile(versionFilePath, 'utf8', function(err, data) {
    if (err) throw err;

    fs.writeFile(versionFilePath, version);
  });

  //yuidoc.json
  fs.readFile(yuidocFilePath, 'utf8', function(err, data) {
    if (err) throw err;

    var json = JSON.parse(data);
    json.version = version;

    fs.writeFile(yuidocFilePath, JSON.stringify(json, null, 4));
  });

  //package.json
  fs.readFile(packageJsonFilePath, 'utf8', function(err, data) {
    if (err) throw err;

    var json = JSON.parse(data);
    json.version = version;

    fs.writeFile(packageJsonFilePath, JSON.stringify(json, null, 4));
  });

  //sideshow.gemspec
  fs.readFile(gemspecFilePath, 'utf8', function(err, data) {
    if (err) throw err;

    fs.writeFile(gemspecFilePath, data.replace(/(s.version\s+=\s+)('[\d.]+')/, "$1'" + version + "'"));
  });

  //copyright_info.js
  fs.readFile(copyrightInfoFilePath, 'utf8', function(err, data) {
    if (err) throw err;

    fs.writeFile(copyrightInfoFilePath, data
                                        .replace(/(Version: )([\d.]+)/, '$1' + version)
                                        .replace(/(Date: )([\d-]+)/, '$1' + releaseDate));
  });

  //CHANGELOG file
  fs.readFile(changelogFilePath, 'utf8', function(err, data) {
    if (err) throw err;

    if(data.indexOf('#Version '+ version) == -1){
      var versionChangelogText = '#Version ' + version + ' ' + name + ' (' + releaseDate + ')' +
                                 '\n\n##General' + 
                                 '\n\n##Fixes\n\n' +
                                 Array(61).join('-') + '\n\n';

      fs.writeFile(changelogFilePath, versionChangelogText + data);
    }
  });

  fs.readFile(variablesFilePath, 'utf8', function(err, data) {
    if (err) throw err;

    fs.writeFile(variablesFilePath, data.replace(/(get VERSION\(\) {\s+return )("[\d.]+")/, '$1"' + version + '"'));
  });
});

gulp.task('generate-docs', function() {
  gulp.src("./distr/sideshow.js")
  .pipe(yuidoc())
  .pipe(gulp.dest("./docs"));
});

gulp.task('prepare-build', ['update-version', 'clean'], function() {
  console.log('Remember to edit the CHANGELOG file before doing a complete build.');
});

gulp.task('complete-build', function() {
  if(prompt.confirm('Did you run the prepare-build before this?')){
    gulp.start('style');
    gulp.start('bundle-scripts');  
    gulp.start('generate-docs');  
  } 
});

function errorHandler(title){
  return function(error){
    console.log((title || 'Error') + ': ' + error.message); 
    notify((title || 'Error') + ': ' + error.message); 
  };
}

function autoPrefixerConfig(){
  return autoprefixer('last 2 version', 'safari 5', 'ie 9', 'opera 12.1', 'ios 6', 'android 4');
}
