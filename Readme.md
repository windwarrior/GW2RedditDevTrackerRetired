# Requirements
    npm install browserify babelify handlebars jquery moment uglifyjs snuownd babelify-es6-polyfill babel-preset-es2015

# Compilation of bundle.js
    browserify js/app.js | uglifyjs > bundle.js
