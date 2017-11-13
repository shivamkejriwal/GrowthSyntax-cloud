const request = require('request');
const querystring = require('querystring');
const config = require('./config.js');


const round = (value, precision) => {
    const multiplier = Math.pow(10, precision);
    return Math.round(value * multiplier) / multiplier;
}

const paramsToObj = (str) => querystring.parse(str);

const objToParams = (obj) => querystring.stringify(obj);


const getData = (url, params, cb) => {
    let query = objToParams(params);
    // console.log(`getData: ${url}?${query}`);
    request(`${url}?${query}`, { json: true }, cb);
}


const getFirebaseDB = () => {
    const admin = require('firebase-admin');
    const serviceAccount = config.firebase.api_key;
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://growthsyntax.firebaseio.com"
    });
    return admin.firestore();
}

module.exports = {
    round,
    getData,
    getFirebaseDB
};
