/*-----------------------------------------------------------------------------
This template gets you started with a simple dialog that echoes back what the user said.
To learn more please visit
https://docs.botframework.com/en-us/node/builder/overview/
-----------------------------------------------------------------------------*/
"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var azure = require('azure-storage');
//var request = require('request');
var luis = require('./luis_stub.js');
var utils = require('./utils.js');
//var db = require('./documentdb.js');
var tripit = require('./tripit.js');

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

/*
var bot = new builder.UniversalBot(connector, function(session) {
    session.endDialog('Hello there!');
});
*/

var bot = new builder.UniversalBot(connector);
var tripit_auth_url = 'https://tripit-auth.azurewebsites.net/';

/* NOT WORKING - Returned intent seems to be cached on Azure Function
var recognizer = null;
recognizer = new builder.LuisRecognizer(model);
var intents = new builder.IntentDialog({ recognizers: [recognizer] });
intents.matches('Greet', '/greeting');
intents.matches('Login', '/login');
intents.onDefault('/default');
*/

//bot.dialog('/', intents);
bot.dialog('/', function(session) {

    // Check if this is a 'conversation' and if tripit was mentioned
    // Ignore chat if it's in a channel/group and 'tripit' was NOT mentioned
    if ((typeof session.message.address.conversation.name !== 'undefined') && (session.message.text.toLowerCase().indexOf('tripit') == -1)) {
        //session.send('Match')
        console.log('<Chat ignored>: ' + JSON.stringify(session.message.address.conversation));
        session.endDialog();
    } else {
        console.log('Went here');
        // Save user's address so we can reply later,
        // ... will be passed as state during authentication
        var stateObject = {
            address: session.message.address,
            text: session.message.text
        };
        //var message = session.message.text;

        // Figure out what the user is trying to say
        luis.getIntent(session.message.text, function(err, response) {
            var intent = response.topScoringIntent.intent;

            switch (intent) {
                case 'Login':
                    // Package state along with the auth url
                    console.log('... to Login intent');
                    var stateObjectBuffer = new Buffer(JSON.stringify(stateObject)).toString('base64');
                    var card = new builder.SigninCard(session)
                        .text('TripIt Sign-in')
                        .button('Sign-in', tripit_auth_url + 'auth/tripit?' + '&state=' + stateObjectBuffer);

                    var msg = new builder.Message(session).addAttachment(card);

                    // If message was typed in a group/channel, turn it into PM as this is login
                    if ((typeof session.message.address.conversation.name !== 'undefined') && (session.message.address.channelId != 'webchat')) delete session.message.address.conversation;

                    session.send(msg);
                    //session.send(JSON.stringify(stateObject));
                    //session.send('Click to login: ' + tripit_auth_url + 'auth/tripit?' + '&state=' + stateObjectBuffer);
                    break;
                case 'Greet':
                    session.send('Greet');
                    break;
                case 'GetTrips':
                    //session.send('Get Trips');

                    var address = session.message.address;
                    var id = address.user.id;
                    var name = address.user.name;
                    var channelId = address.channelId;
                    var serviceUrl = address.serviceUrl;

                    tripit.getCreds(id, name, channelId, serviceUrl)
                        .then((credArr) => {
                            //session.send(JSON.stringify(credArr[0]));
                            session.userData.tripit_auth = credArr[0].tripit_auth;
                        })
                        .then(() => {
                            return tripit.listTrips(session.userData.tripit_auth.tripit_token, session.userData.tripit_auth.tripit_tokenSecret);
                        })
                        .then((listArr) => {
                            var trips = JSON.parse(listArr).Trip;
                            var cards = [];
                            for (var i = 0, len = trips.length; i < len; i++) {
                                var card = new builder.ThumbnailCard(session)
                                    .title('Trip name: ' + trips[i].display_name)
                                    .subtitle(trips[i].start_date + ' - ' + trips[i].primary_location) //trips[i].start_date + ' - ' + trips[i].primary_location)
                                    .text('Your trip to ' + trips[i].primary_location + ' from ' + trips[i].start_date + ' to ' + trips[i].end_date) //+ trips[i].primary_location + ' from ' + trips[i].start_date + ' to ' + trips[i].end_date)
                                    .images([
                                        builder.CardImage.create(session, trips[i].image_url) //trips[i].image_url)
                                    ])
                                    .buttons([
                                        builder.CardAction.openUrl(session, 'https://www.tripit.com/trip/show/id/' + trips[i].id, 'View in TripIt'),
                                        //builder.CardAction.openUrl(session, 'https://www.tripit.com/trip/show/id/' + trips[i].id, 'Share Trip')
                                        builder.CardAction.dialogAction(session, "Share", "<trip data to share>", "Share trip")
                                    ]);
                                cards.push(card);
                            }

                            // create reply with Carousel AttachmentLayout
                            var reply = new builder.Message(session)
                                .attachmentLayout(builder.AttachmentLayout.carousel)
                                .attachments(cards);

                            session.send(reply);

                            //session.send('Trips: ' + trips);
                        })
                        .catch((error) => {
                            session.send(JSON.stringify(error));
                        });

                    //session.send('Address: ' + id + ' ' + name + ' ' + channelId + ' ' + serviceUrl);
                    break;
                case 'Random':
                    session.send('Random');
                    break;
                case 'Debug':
                    session.send('Debug');
                    break;

            }
            //session.send(response.topScoringIntent.intent);
        });
    }
});

bot.beginDialogAction('Share', '/share');

// Create the dialog itself.
bot.dialog('/share', [
    function (session, args) {
        session.endDialog("Trip shared: " + args.data);
    }
]);

// Intercept trigger event (ActivityTypes.Trigger)
bot.on('trigger', function(message) {
    console.log('Triggered');
    // Handle message from trigger function
    var queuedMessage = message.value;

    // Becomes a PM to Slack when .conversation is removed
    if (queuedMessage.address.channelId != 'webchat') delete queuedMessage.address.conversation;

    // TODO: Test on login when these params are missing
    var payload = JSON.parse(queuedMessage.text);

    if(payload.action = 'share') {

    }
    else if (payload.notification) {
        var auth = payload.auth;
        var notification = payload.notification;

        //bot.send('Notification: ' + JSON.stringify(notification));

        tripit.getTrip(auth.tripit_token, auth.tripit_tokenSecret, notification.tripit_id)
            .then((_trip) => {
                // Construct message to send to the channel

                //var reply = new builder.Message()
                //    .address(queuedMessage.address)
                //    .text('This is coming from the trigger: ' + JSON.stringify(trip));

                /*
                var reply = new builder.Message()
                    .address(queuedMessage.address)
                    .text('Payload: ' + JSON.stringify(trip));

                // Send it to the channel
                bot.send(reply);
                */
                var trip = JSON.parse(_trip);

                var card = new builder.ThumbnailCard()
                    .title('TripIt Alert')
                    .subtitle('Trip date: ' + trip.Trip.start_date)
                    .text('Your trip to ' + trip.Trip.primary_location + ' has been ' + notification.tripit_change)
                    .images([
                        builder.CardImage.create(null, trip.Trip.image_url)
                    ])
                    .buttons([
                        builder.CardAction.openUrl(null, 'https://www.tripit.com/trip/show/id/' + notification.tripit_id, 'View in TripIt')
                    ]);

                var msg = new builder.Message()
                    .address(queuedMessage.address)
                    .addAttachment(card);
                // Send it to the channel
                bot.send(msg);
                //bot.send(JSON.stringify(message));

            })
            .catch((error) => {
                bot.send('Error: ' + error)
            });

        // Below means we're getting notification from TripIt Webhook function
        // .. and not internally e.g. login

    } else {
        var reply = new builder.Message()
            .address(queuedMessage.address)
            //.text('This is coming from the trigger: ' + JSON.stringify(message));
            .text('You\'re logged in!');

        // Send it to the channel
        bot.send(reply);
    }


    // Construct message to send to the channel

    /*
    var reply = new builder.Message()
        .address(queuedMessage.address)
        .text('This is coming from the trigger: ' + payload.notification);

    // Send it to the channel
    bot.send(reply);
    */

    /* Was testing to see if this will work, nope it didn't
    bot.beginDialog(reply, 'fromTrigger', null, (err) => {
        if (err) {
            // error ocurred while starting new conversation. Channel not supported?
            bot.send(new builder.Message()
                .text('This channel does not support this operation: ' + err.message)
                .address(queuedMessage.address));
        }
    });
    */

});

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpoint at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());
} else {
    module.exports = {
        default: connector.listen()
    }
}





/*
// Handle message from user
bot.dialog('/', function (session) {
    var queuedMessage = { address: session.message.address, text: session.message.text };
    // add message to queue
    session.sendTyping();
    var queueSvc = azure.createQueueService(process.env.AzureWebJobsStorage);
    queueSvc.createQueueIfNotExists('bot-queue', function(err, result, response){
        if(!err){
            // Add the message to the queue
            var queueMessageBuffer = new Buffer(JSON.stringify(queuedMessage)).toString('base64');
            queueSvc.createMessage('bot-queue', queueMessageBuffer, function(err, result, response){
                if(!err){
                    // Message inserted
                    session.send('Your message (\'' + session.message.text + '\') has been added to a queue, and it will be sent back to you via a Function');
                } else {
                    // this should be a log for the dev, not a message to the user
                    session.send('There was an error inserting your message into queue');
                }
            });
        } else {
            // this should be a log for the dev, not a message to the user
            session.send('There was an error creating your queue');
        }
    });

});

// Handle login intent from user
bot.dialog('/block_for_now', function(session) {
    var queuedMessage = {
        address: session.message.address,
        text: session.message.text
    };
    // add message to queue
    session.sendTyping();

    var queueSvc = azure.createQueueService(process.env.AzureWebJobsStorage);
    queueSvc.createQueueIfNotExists('bot-queue', function(err, result, response) {
        if (!err) {
            // Add the message to the queue
            var queueMessageBuffer = new Buffer(JSON.stringify(queuedMessage)).toString('base64');
            queueSvc.createMessage('bot-queue', queueMessageBuffer, function(err, result, response) {
                if (!err) {
                    // Message inserted
                    session.send('Your message (\'' + session.message.text + '\') has been added to a queue, and it will be sent back to you via a Function');
                } else {
                    // this should be a log for the dev, not a message to the user
                    session.send('There was an error inserting your message into queue');
                }
            });
        } else {
            // this should be a log for the dev, not a message to the user
            session.send('There was an error creating your queue');
        }
    });

});

*/
