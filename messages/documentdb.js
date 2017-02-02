var documentClient = require("documentdb").DocumentClient;
//var config = require("./config");
var url = require('url');

var config = {};
config.database = {
    "id": "TripIt"
};
config.collection = {
    "id": "Auth"
};

/*
config.documents = {
    "Andersen": {
        "id": "Anderson.1",
        "lastName": "Andersen",
        "parents": [{
            "firstName": "Thomas"
        }, {
            "firstName": "Mary Kay"
        }],
        "children": [{
            "firstName": "Henriette Thaulow",
            "gender": "female",
            "grade": 5,
            "pets": [{
                "givenName": "Fluffy"
            }]
        }],
        "address": {
            "state": "WA",
            "county": "King",
            "city": "Seattle"
        }
    },
    "Wakefield": {
        "id": "Wakefield.7",
        "parents": [{
            "familyName": "Wakefield",
            "firstName": "Robin"
        }, {
            "familyName": "Miller",
            "firstName": "Ben"
        }],
        "children": [{
            "familyName": "Merriam",
            "firstName": "Jesse",
            "gender": "female",
            "grade": 8,
            "pets": [{
                "givenName": "Goofy"
            }, {
                "givenName": "Shadow"
            }]
        }, {
            "familyName": "Miller",
            "firstName": "Lisa",
            "gender": "female",
            "grade": 1
        }],
        "address": {
            "state": "NY",
            "county": "Manhattan",
            "city": "NY"
        },
        "isRegistered": false
    }
};
*/

config.documents = {
    
}
var client = new documentClient(process.env.DB_ENDPOINT, {
    "masterKey": process.env.DB_PRIMARY_KEY
});

var HttpStatusCodes = {
    NOTFOUND: 404
};
var databaseUrl = `dbs/${config.database.id}`;
var collectionUrl = `${databaseUrl}/colls/${config.collection.id}`;

function getDatabase() {
    console.log(`Getting database:\n${config.database.id}\n`);

    return new Promise((resolve, reject) => {
        client.readDatabase(databaseUrl, (err, result) => {
            if (err) {
                if (err.code == HttpStatusCodes.NOTFOUND) {
                    client.createDatabase(config.database, (err, created) => {
                        if (err) reject(err)
                        else resolve(created);
                    });
                } else {
                    reject(err);
                }
            } else {
                resolve(result);
            }
        });
    });
}

function getCollection() {
    console.log(`Getting collection:\n${config.collection.id}\n`);

    return new Promise((resolve, reject) => {
        client.readCollection(collectionUrl, (err, result) => {
            if (err) {
                if (err.code == HttpStatusCodes.NOTFOUND) {
                    client.createCollection(databaseUrl, config.collection, {
                        offerThroughput: 400
                    }, (err, created) => {
                        if (err) reject(err)
                        else resolve(created);
                    });
                } else {
                    reject(err);
                }
            } else {
                resolve(result);
            }
        });
    });
}

function getAuthDocument(document) {
    let documentUrl = `${collectionUrl}/docs/${document.id}`;
    console.log(`Getting document:\n${document.id}\n`);

    return new Promise((resolve, reject) => {
        //client.readDocument(documentUrl, { partitionKey: document.district }, (err, result) => {
        client.readDocument(documentUrl, {}, (err, result) => {
            if (err) {
                if (err.code == HttpStatusCodes.NOTFOUND) {
                    client.createDocument(collectionUrl, document, (err, created) => {
                        if (err) reject(err)
                        else resolve(created);
                    });
                } else {
                    reject(err);
                }
            } else {
                resolve(result);
            }
        });
    });
};

function exit(message) {
    console.log(message);
    console.log('Press any key to exit');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, 0));
}

exports.getDatabase = getDatabase;
exports.getCollection = getCollection;
exports.getAuthDocuments = getAuthDocument;


if (process.env.NODE_ENV == 'development') {
    getDatabase()
        .then(() => getCollection())
        .then(() => {
            exit(`Completed successfully`);
        })
        .catch((error) => {
            exit(`Completed with error ${JSON.stringify(error)}`)
        });
}
