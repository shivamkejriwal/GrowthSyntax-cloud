const functions = require('firebase-functions');
const _ = require('underscore');
const csv = require('csv');
const crud = require('./crud');


const util = require('../common/utils');
const config = require('../common/config.js');
const sharadarUrl = 'https://www.quandl.com/api/v3/datatables/SHARADAR/SEP.json';

const indicators = ['ticker', 'date', 'open', 'close', 'volume'];
const params = {
    'api_key': config.quandl.api_key,
    'date': util.getDay(),
    'qopts.columns': indicators.toString()
};

const errorHandler = (err, reject) => {
    console.log('errorHandler', err);
    reject(err);
};


const getPriceData = () => {
    
    const successHandler = (result, resolve, reject) => {
        console.log('sectors:getPriceData - successHandler');
        if (!result) errorHandler('No Results.', reject);
        if (!result.datatable) errorHandler('No Datatable.', reject);
    
        const dataList = result.datatable.data || [];
        const columnsList = result.datatable.columns || [];
        if (!dataList.length) errorHandler('No Data.', reject);
    
        console.log(`Price data found for ${dataList.length} companies`);
    
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
        const results = _.values(resultsMap);
        resolve(results);
    }

    console.log(`Getting prices for ${params.date}`);
    return new Promise((resolve, reject) => {
        util.getData(sharadarUrl, params, (err, res, body) => {
            if (err) {
                errorHandler(err, reject);
            }
            successHandler(body, resolve, reject);
        });
    })
}

const execute = () => {
    return getPriceData().then(companies => {
        const movers = {
            'date': params.date,
            decliners: 0,
            advancers: 0,
            name: 'Advancers-Decliners',
            type: 'Market-Data'
        };
        _.each(companies, company => {
            if (company.close > company.open) {
                movers.advancers = movers.advancers + 1;
            } else {
                movers.decliners = movers.decliners + 1;
            }
        });
        console.log(movers);
        return movers;
    });
}

exports.load = functions.https.onRequest((request, response) => {
    let movers = {};
    execute('').then(result => {
        movers = result;
        return crud.create(result);
    }).then(result => {
        response.send(`Advancers(${movers.advancers})-Decliners(${movers.decliners})`);
    }).catch(err => {
        response.send('Error on Advancers-Decliners.');
    });
});