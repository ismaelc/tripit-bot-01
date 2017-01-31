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
//var utils = require('./utils.js');
var db = require('./documentdb.js');

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

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

    var stateObject = {
        address: session.message.address,
        text: session.message.text
    };
    //var message = session.message.text;

    luis.getIntent(session.message.text, function(err, response) {
        var intent = response.topScoringIntent.intent;

        switch (intent) {
            case 'Login':
                //TODO: Need to send this as PM
                var stateObjectBuffer = new Buffer(JSON.stringify(stateObject)).toString('base64');
                session.send('Click to login: ' + tripit_auth_url + 'auth/tripit?' + '&state=' + stateObjectBuffer);
                break;
            case 'Greet':
                session.send('Greet');
                break;
            case 'Random':
                session.send('Random');
                break;
            case 'Debug':
                db.getDatabase()
                    .then(() => {
                        //db.exit(`Completed successfully`);
                        session.send('Completed successfully');
                    })
                    .catch((error) => {
                        //exit(`Completed with error ${JSON.stringify(error)}`)
                        session.send('Completed eith error ${JSON.stringify(error)}');
                    });
                break;
        }
        //session.send(response.topScoringIntent.intent);
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

// Intercept trigger event (ActivityTypes.Trigger)
bot.on('trigger', function(message) {
    console.log('Triggered');
    // handle message from trigger function
    var queuedMessage = message.value;
    var reply = new builder.Message()
        .address(queuedMessage.address)
        .text('This is coming from the trigger: ' + queuedMessage.text);
    bot.send(reply);
});

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
*/

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());
} else {
    module.exports = {
        default: connector.listen()
    }
}
