const functions = require('firebase-functions');
const articles = require('./articles');
const companies = require('./companies');
const sectors = require('./sectors')

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.helloWorld = functions.https.onRequest((request, response) => {
 response.send("Hello from Firebase!");
});

exports.valueline = articles.valueline.load;
exports.blackrock = articles.blackrock.load;
exports.vanguard = articles.vanguard.load;
exports.prices = companies.prices.load;
exports.sectors = sectors.groupings.load;
exports.marketMovers = sectors.marketMovers.load;