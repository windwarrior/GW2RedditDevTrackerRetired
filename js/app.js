window.$ = window.jQuery = require('jquery/dist/jquery.min');
require("babelify-es6-polyfill");
var constants = require('./constants');
var moment = require('moment/min/moment.min');
var Handlebars = require('handlebars/dist/handlebars.min');

var SnuOwnd = require('snuownd');

$(document).ready(function () {
  // firstly lets promise ourselves a subreddit reference
  var subredditPromise = Promise.resolve($.ajax(constants.REDDIT_API_URL + 'r/' + constants.SUBREDDIT_NAME + '/about.json'));

  subredditPromise.then( function (jsonObj) {
      var subreddit_id = jsonObj["data"]["name"];

      // Return a promise that resolves when all devs have been queried
      return Promise.all(
        constants.ARENANET_DEVELOPERS.map(function (elem) {
          return createDevPromise(elem, subreddit_id);
        })
      );
  }).then( function (arrResults) {
    // now we can merge all children array, sort them, limit them to the lastest few and display them

    // reduce the list of lists to a single list
    commentArray = arrResults.reduce(function (a, b) {
      return a.concat(b);
    });

    // sort that list on timestamp
    var compareFunc = function (a, b) {
      // Return the difference between created timestamps
      // we want to sort in reversed order, so here we take the diff in timestamp between a and b.
      // If a's  timestamp is lower then that of b the comparator will result in a positve value and sort a below b
      return  b["data"]["created"] - a["data"]["created"];
    }

    var commentArray = commentArray.sort(compareFunc);

    return commentArray.slice(0, 100);
  }).then( function (comments) {
    var source = $("#comment-template").html();
    var template = Handlebars.compile(source);

    comments.forEach(function (val, index, array) {
      var commentdate = moment.unix(val["data"]["created_utc"]);
      var context = {
        title: val["data"]["link_title"],
        author: val["data"]["author"],
        subreddit: val["data"]["subreddit"],
        contents: SnuOwnd.getParser().render(val["data"]["body"]),
        link_author : val["data"]["link_author"],
        date_absolute: commentdate.format("dddd, MMMM Do YYYY, h:mm:ss a"),
        date_relative: commentdate.fromNow(),
        link_url: val["data"]["link_url"],
        score: val["data"]["score"],
        comment_thread: "https://www.reddit.com/r/" + val["data"]["subreddit"] + '/' + val["data"]["link_id"].slice(3, val["data"]["link_id"].length),
        link_author_url: "https://www.reddit.com/u/"+ val["data"]["link_author"],
        author_url: "https://www.reddit.com/u/" + val["data"]["author"],
        context: "https://www.reddit.com/r/" + val["data"]["subreddit"] + '/comments/' + val["data"]["link_id"].slice(3, val["data"]["link_id"].length) + "/slug/" + val["data"]["id"] + "?context=3",
        parent_id: val["data"]["parent_id"]
      }

      var html = template(context);



      $("#devtracker").append(html);
    });



    $('details[data-parent-id!=""]').one('click', function() {
      if (!$(this).attr('open')) {
        let anchor = $(this);
        Promise.resolve($.ajax(constants.REDDIT_API_URL + 'api/info.json?id=' + $(this).data('parent-id')).then(function (result) {
          console.log($(this));

          let enveloppe = result["data"]["children"][0];
          let comment = enveloppe["data"];
          let kind = enveloppe["kind"];
          let md = "";

          if (kind == "t3") {
            // its a main post
            if (comment["selftext"]) {
              md = comment["selftext"];
            } else if (comment["url"]) {
              md = comment["url"];
            }
          } else if (kind == "t1") {
            // its an comment
            md = comment["body"];
          }

          anchor.find('.parent').html(SnuOwnd.getParser().render(md));
        }));
      }
    });
  }).catch( function (error) {
    var source = $("#error-template").html();
    var template = Handlebars.compile(source);
    var context = {
      human_error: 'Something broke horribly! Yell at your favorite windwarrior!',
      dev_error: JSON.stringify(error),
    }

    var html = template(context);

    $("#errors").append(html);
  }).then( function (thing) {
    $("#loading-spinner").hide();
  });
});

function createDevPromise (devname, subreddit_id) {
  var params = {
      sort: 'new',
      limit: 100
  }

  return Promise.resolve($.ajax({
    url: constants.REDDIT_API_URL + 'user/'+ devname + '/comments/.json',
    type: 'get',
    data: params
  })).then(function (result) {
    // reject a json object that has an error
    if (result["error"]) {
      return Promise.reject('Received invalid JSON for a dev');
    }

    return result;
  }).then(function (result) {
    // Only return messages by devs in the right subreddit
    result["data"]["children"] = result["data"]["children"].filter( function (value) {
      return value["data"]["subreddit_id"] == subreddit_id;
    });

    // return the array that we modified inplace
    return result;
  }).then(function (result) {
    // no need to keep anything more then the children array
    return result["data"]["children"];
  }).catch( function (error) {
    var source = $("#error-template").html();
    var template = Handlebars.compile(source);
    var context = {
      human_error: 'Failed to load information for dev ' + devname,
      dev_error: JSON.stringify(error),
    }

    var html = template(context);

    $("#errors").append(html);

    return [];
  });
}
