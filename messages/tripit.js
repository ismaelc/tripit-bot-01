var OAuth = require('oauth').OAuth;

var TRIPIT_API_KEY = "617fdb56c4883524621c3a8e0f08dfde20d74a31"
var TRIPIT_API_SECRET = "ce9e3924f25d8124300c6be093e73213a57ec1ce";

var tripit_oauth = new OAuth(
    "https://api.tripit.com/oauth/request_token",
    "https://api.tripit.com/oauth/access_token",
    TRIPIT_API_KEY,
    TRIPIT_API_SECRET,
    "1.0",
    null,
    "HMAC-SHA1"
);

function getTrip(token, tokenSecret, id) {
    return new Promise((resolve, reject) => {
        tripit_oauth.get(
            //'https://api.tripit.com/v1/list/trip?format=json', // try trips for testing only
            'https://api.tripit.com/v1/get/trip/id/' + id + '/format/json',
            token, //test user token
            tokenSecret, //test user secret
            (e, data, _res) => {
                if(e) reject(e);
                else resolve(data);
            }
        )
    });
}

exports.getTrip = getTrip;