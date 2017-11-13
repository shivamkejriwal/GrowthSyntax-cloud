const functions = require('firebase-functions');
const _ = require('underscore');
const crud = require('./crud');
const analysis = require('./analysis');

const util = require('../common/utils');
const config = require('../common/config.js');

const sharadarUrl = 'https://www.quandl.com/api/v3/datatables/SHARADAR/SEP.json';
const indicators = ['ticker', 'date', 'open', 'close', 'volume'];
const params = {
    'api_key': config.quandl.api_key,
    'date': util.getLastMarketDay(),
    'qopts.columns': indicators.toString()
};


const errorHandler = (err, data) => console.log('errorHandler', {err, data});

const successHandler = (result, done) => {
    console.log('successHandler');
    if (!result) return errorHandler('No Results.', result);
    if (!result.datatable) return errorHandler('No Datatable.', result);

    const dataList = result.datatable.data || [];
    const columnsList = result.datatable.columns || [];
    console.log(`datafound: ${dataList.length}`);

    const resultsMap = {};
    _.each(dataList, (payload, listIndex) => {
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
    done(results);
}

const getData = () => {
    return new Promise(( resolve, reject) => {
        util.getData(sharadarUrl, params, (err, res, body) => {
            if (err) {
                reject(err);
            }
            successHandler(body, resolve);
        });
    })
}

exports.load = functions.https.onRequest((request, response) => {
    getData(results => {
        const count = results.length;
        crud.createBatch(results)
        .then(res => {
            response.send(`Completed ${count} Prices loads`);
        }).catch(err => {
            response.send(`Error on prices`);
        });
    });
});