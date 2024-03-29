const functions = require('firebase-functions');
const _ = require('underscore');
const crud = require('./crud');
const analysis = require('./analysis');

const util = require('../common/utils');
const config = require('../common/config.js');
const tickerList = require('./tickerList.json');

// const sharadarUrl = 'https://www.quandl.com/api/v3/datatables/SHARADAR/SEP.json';
const sharadarUrl = 'https://data.nasdaq.com/api/v3/datatables/SHARADAR/SEP';
const indicators = ['ticker', 'date', 'open', 'close', 'volume'];
// const tickers = ['PYPL', 'cvs'];
const params = {
    'api_key': config.quandl.api_key,
    'date': util.getDay(),
    'qopts.columns': indicators.toString(),
    // 'ticker': tickers.toString()
};

const getIndex = (key) => indicators.indexOf(key);

const errorHandler = (err, reject) => {
    console.log('errorHandler', err);
    reject(err);
};

const successHandler = (result, resolve, reject) => {
    console.log('successHandler');
    if (!result) errorHandler('No Results.', reject);
    if (!result.datatable) errorHandler('No Datatable.', reject);

    let dataList = result.datatable.data || [];
    const columnsList = result.datatable.columns || [];
    if (!dataList.length) errorHandler('No Data.', reject);
    dataList = _.filter(dataList, ele => tickerList.includes(ele[0]))
    console.log(`datafound: ${dataList.length}`);
    const resultsMap = {};
    _.each(dataList, (payload) => {
        const obj = {};
        _.each(payload, (item, index) => {
            const key = columnsList[index].name;
            const value = item;
            obj[key] = value;
        });
        resultsMap[obj.ticker] = obj;
    });
    analysis.doAnalysis(resultsMap, 10);
    const results = _.values(resultsMap);
    resolve(results);
}

const getData = async (date) => {
    console.log(`Getting prices for ${date || params.date}`);
    if (date) {
        params.date = date;
    }
    return new Promise(( resolve, reject) => {
        util.getData(sharadarUrl, params, (err, res, body) => {
            if (err) {
                reject(err);
            }
            successHandler(body, resolve, reject);
        });
    })
}

const test = () => {
    let count = 0;
    getData()
    .then(results => {
        count = results.length;
        console.log(`Results found: ${count}`);
        return crud.createBatch(results);
    }).then(result => {
        console.log(`Updating ${count} company prices.`);
    }).catch(err => {
        console.log('Error on updating prices.');
    });
}

exports.getPrices = getData;

exports.load = functions.https.onRequest((request, response) => {
    let count = 0;
    getData().then(results => {
        count = results.length;
        return crud.createBatch(results);
    }).then(result => {
        response.send(`Updating ${count} company prices.`);
    }).catch(err => {
        response.send('Error on updating prices.');
    });
});

// test();