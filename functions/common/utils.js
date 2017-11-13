const request = require('request');
const querystring = require('querystring');
const moment = require('moment');
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

const getLastMarketDay = () => {
    const day = moment().format('dddd');
    const hour = moment().hour();

    let diff = 0
    if (day === 'Sunday') {
        diff = 2;
    }
    else if (day === 'Saturday') {
        diff = 1;
    }
    else if (hour <= 14) {
        diff = 1;
    }
    return moment().subtract(diff, 'days').format('YYYY-MM-DD');
}


const getFirebaseDB = () => {
    const admin = require('firebase-admin');
    const serviceAccount = config.firebase.api_key;
    const options = {
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://growthsyntax.firebaseio.com"
    };
    if (!admin.apps.length) {
        admin.initializeApp(options);
    }
    return admin.firestore();
}

module.exports = {
    round,
    getData,
    getLastMarketDay,
    getFirebaseDB
};
