var subreddit = "Guildwars2";

$(document).ready(function () {
  // firstly lets promise ourselves a subreddit reference
  var subredditPromise = Promise.resolve($.ajax(REDDIT_API_URL + '/r/' + SUBREDDIT_NAME + '/about.json'));

  subredditPromise.then( function (jsonObj) {
      var subreddit_id = jsonObj["data"]["name"];

      // Return a promise that resolves when all devs have been queried
      return Promise.all(
        ARENANET_DEVELOPERS.map(function (elem) {
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
      var context = {
        title: val["data"]["link_title"],
        author: val["data"]["author"],
        subreddit: val["data"]["subreddit"],
        contents: val["data"]["body"],
        link_author : val["data"]["link_author"],
        date: moment.unix(val["data"]["created_utc"]).format("dddd, MMMM Do YYYY, h:mm:ss a"),
        link_url: val["data"]["link_url"],
        comment_thread: "http://www.reddit.com/r/" + val["data"]["subreddit"] + '/' + val["data"]["link_id"].slice(3, val["data"]["link_id"].length),
        link_author_url: "http://www.reddit.com/u/"+ val["data"]["link_author"],
        author_url: "http://www.reddit.com/u/" + val["data"]["author"],
        context: "http://www.reddit.com/r/" + val["data"]["subreddit"] + '/comments/' + val["data"]["link_id"].slice(3, val["data"]["link_id"].length) + "/slug/" + val["data"]["id"],
      }

      var html = template(context);

      $("#devtracker").append(html);
    });
  }).catch( function (error) {
    console.log("Something broke horribly! Yell at your favorite windwarrior and give him this error: ");
    console.log(error);
  });
});


function createDevPromise (devname, subreddit_id) {
  var params = {
      sort: 'new',
      count: 100
  }

  return Promise.resolve($.ajax({
    url: REDDIT_API_URL + 'user/'+ devname + '/comments/.json',
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
    result["data"]["children"].filter( function (value) {
      return value["data"]["subreddit_id"] == subreddit_id;
    });

    // return the array that we modified inplace
    return result;
  }).then(function (result) {
    // no need to keep anything more then the children array
    return result["data"]["children"];
  }).catch( function (error) {
    console.error("Failed to load json for dev: " + devname);
  });
}
