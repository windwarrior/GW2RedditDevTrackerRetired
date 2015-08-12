# Requirements
    npm install browserify, babelify, handlebars, jquery, moment, uglifyjs

# Compilation of bundle.js
    browserify js/app.js -t babelify | uglifyjs > bundle.js
