/*-----------------------------------------------------------------------------
This template gets you started with a simple dialog that echoes back what the user said.
To learn more please visit
https://docs.botframework.com/en-us/node/builder/overview/
-----------------------------------------------------------------------------*/
"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var azure = require('azure-storage');
var request = require('request');

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector);
var model = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/b0c6e3f0-b160-4b8b-83d1-060f85469721?subscription-key=c3b92446504d44eab832c686944145d6&verbose=true' + '&r=' + Math.random().toString(36).substring(7);
var recognizer = null;
recognizer = new builder.LuisRecognizer(model);
var intents = new builder.IntentDialog({ recognizers: [recognizer] });

//bot.dialog('/', intents);
bot.dialog('/', function(session) {

 
   request(model + '&q=' + session.message.text, function (error, response, body) {
     if (!error && response.statusCode == 200) {
       //console.log(body) // Show the HTML for the Google homepage.
       session.send(body);
     }
   });
    
});

intents.matches('Greet', '/greeting');
intents.matches('Login', '/login');
intents.onDefault('/default');

bot.dialog('/greeting', function(session) {
   //session.send('Hey'); 
   //session.send('Greeting');
   
   request('http://www.google.com', function (error, response, body) {
     if (!error && response.statusCode == 200) {
       //console.log(body) // Show the HTML for the Google homepage.
       session.send(session.message.text);
     }
   });
   
});

// Handle login intent from user
bot.dialog('/login', function (session) {
    var queuedMessage = { address: session.message.address, text: session.message.text };
    // add message to queue
    //session.sendTyping();
    //session.send('/test');
    session.send('Login')
    
    /*
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
    */
});

bot.dialog('/default', function(session) {
  session.send('Default');  
});

// Intercept trigger event (ActivityTypes.Trigger)
bot.on('trigger', function (message) {
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
    module.exports = { default: connector.listen() }
}


