const request = require('request');
const _ = require('underscore');
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
    const query = objToParams(params);
    request(`${url}?${query}`, { json: true }, cb);
}

const getLastMarketDay = () => {
    const isWeekend = (date) => {
        const weekends = ['Sunday', 'Saturday'];
        const day = date.format('dddd');
        return _.contains(weekends, day);
    }
    const isMarketOpen = (date) => {
        const hour = date.hour();
        return Boolean(hour <= 14);
    }
    
    let day = moment();
    while (isWeekend(day) || isMarketOpen(day)) {
        day = day.subtract(1, 'days');
    }
    const today = moment().format('YYYY-MM-DD');
    const lastMarketDay = day.format('YYYY-MM-DD');
    console.log('getLastMarketDay', {today, lastMarketDay});
    return lastMarketDay;
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
