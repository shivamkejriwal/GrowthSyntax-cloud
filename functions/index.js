const functions = require('firebase-functions');
const articles = require('./articles')

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.helloWorld = functions.https.onRequest((request, response) => {
 response.send("Hello from Firebase!");
});

exports.valueline = articles.valueline.load;
exports.blackrock = articles.blackrock.load;
exports.vanguard = articles.vanguard.load;