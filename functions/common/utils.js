const request = require('request');
const _ = require('underscore');
const querystring = require('querystring');
const moment = require('moment');
const config = require('./config.js');
const firebaseServiceAccount = require('./firebaseServiceAccount.json');

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
    const isMarketClosed = (date) => {
        const hour = date.hour();
        return Boolean(hour > 14);
    }
    const isValidMarketDay = (day) => !isWeekend(day) && isMarketClosed(day);
    let day = moment();
    for( var i = 0; i < 3;i++){
        if (!isValidMarketDay(day)){
            day = day.subtract(1, 'days');
        }
    }
    const today = moment().format('YYYY-MM-DD');
    const lastMarketDay = day.format('YYYY-MM-DD');
    console.log('getLastMarketDay', {today, lastMarketDay});
    return lastMarketDay;
}

const getToday = () => moment().format('YYYY-MM-DD');
const getDayBefore = (day) => day.subtract(1, 'days').format('YYYY-MM-DD');
const getPreviousWorkday = () => {
    let workday = moment();
    let day = workday.day();
    let diff = 1;  // returns yesterday
    if (day == 0 || day == 1){  // is Sunday or Monday
      diff = day + 2;  // returns Friday
    }
    return workday.subtract(diff, 'days').format('YYYY-MM-DD');
}
const getDay = () => {
    const today = moment();
    const day = today.day();
    if ([0, 1, 6].includes(day)) {
        return getPreviousWorkday();
    }
    return today.hour() > 14
    ? getToday()
    : getDayBefore(today);
};
const getLastYear = () => {
    const today = moment();
    return today.subtract(1, 'years').format('YYYY-MM-DD')
};


const getFirebaseDB = () => {
    const admin = require('firebase-admin');
    // const serviceAccount = config.firebase.api_key;
    const serviceAccount = firebaseServiceAccount;
    // serviceAccount.privateKey = serviceAccount.privateKey.replace(/\\n/g, '\n');
    const options = {
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://growthsyntax.firebaseio.com"
    };
    if (!admin.apps.length) {
        admin.initializeApp(options);
    }
    return admin.firestore();
}

const replaceAll = function(target, search, replacement) {
    return target.replace(new RegExp(search, 'g'), replacement);
};

module.exports = {
    round,
    getData,
    getToday,
    getLastMarketDay,
    getDayBefore,
    getDay,
    getLastYear,
    getFirebaseDB,
    replaceAll
};
