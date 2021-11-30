const functions = require('firebase-functions');
const _ = require('underscore');
const csv = require('csv');
const crud = require('./crud');
const analysis = require('./analysis');

const util = require('../common/utils');
const config = require('../common/config.js');
const getPriceData = require('../companies/prices.js').getPrices;
const getProfileData = require('../companies/tickers').getAllData;

// const sharadarUrl = 'https://www.quandl.com/api/v3/datatables/SHARADAR/SEP.json';
const sharadarUrl = 'https://data.nasdaq.com/api/v3/datatables/SHARADAR/SEP';
const sharadarMetaUrl = 'http://www.sharadar.com/meta/tickers.json';
const nasdaqUrl = 'http://www.nasdaq.com/screening/companies-by-name.aspx';
// http://www.nasdaq.com/screening/companies-by-name.aspx?render=download // all exchanges current price

const exchanges = ['nasdaq', 'nyse' , 'amex'];
const indicators = ['ticker', 'date', 'open', 'close', 'volume'];
const params = {
    'api_key': config.quandl.api_key,
    'date': util.getDay(),
    'qopts.columns': indicators.toString()
};

const convertToObject = (array) => {
    const result = {};
    _.each(array, (company) => {
        delete company.mostTraded;
        delete company.mostBought;
        delete company.mostSold;
        delete company.isdelisted;
        result[company.ticker] = company;
    });
    return result;
}

const getGroupingName = (key, profile, company) => {
    let name = profile[company.ticker] ? profile[company.ticker][key] : 'null';
    if (name !== 'n/a') {
        name = util.replaceAll(name ,'/', ':');
    }
    return name;
}

const getGroupingData = (key, profile, prices) => {
    let collection = {};
    const missed = [];
    const type = key[0].toUpperCase() + key.substring(1);
    _.each(prices, company => {
        if (!profile[company.ticker]) {
            missed.push(company.ticker);
        }
        const name = getGroupingName(key, profile, company);
        const data = collection[name] || {
            type, name,
            open : 0, close: 0, volume: 0, totalChange: 0
        };

        const change = company.close - company.open;
        const totalChange = change * company.volume;
    
        data.open = util.round(data.open + company.open, 2);
        data.close = util.round(data.close + company.close, 2);
        data.volume = util.round(data.volume + company.volume, 2);
        data.totalChange = util.round(data.totalChange + totalChange, 2);
    
        collection[name] = data;
    });

    collection = _.mapObject(collection, (val, key) => {
        val.change = util.round(val.close - val.open, 2);
        return val;
    })
    delete collection.null;
    delete collection['n/a'];
    console.log(`Companies missed ${missed.length}`);
    return collection;
}

const execute = () => {
    const counts = {};
    return Promise.all([
        getProfileData(),
        getPriceData()
    ]).then(results => {
        const profile = convertToObject(results[0]);
        const prices = results[1];
        console.log('results', {
            profile: _.keys(profile).length,
            prices: prices.length
        });
        const sectors = _.values(getGroupingData('sector', profile, prices));
        const industries = _.values(getGroupingData('industry', profile, prices));
        console.log('[sk]sectors', sectors);
        counts.sectors = sectors.length;
        counts.industries = industries.length;
        return Promise.all([
            Promise.resolve(counts),
            crud.createBatch(sectors),
            crud.createBatch(industries)
        ]);
    });
}

const test = () => {
    execute().then(results => {
        const counts = results[0];
        console.log(`Sent data for groupings (${counts.sectors}: ${counts.industries})`);
    }).catch(err => {
        console.log('Error on groupings', err);
    });
}

exports.load = functions.https.onRequest((request, response) => {
    execute('').then(results => {
        const counts = results[0];
        response.send(`Sent data for groupings (${counts.sectors}: ${counts.industries})`);
    }).catch(err => {
        response.send('Error on groupings');
    });
});

// test();
