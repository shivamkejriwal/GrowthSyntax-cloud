const fs = require('fs');
const _ = require('underscore');
const crud = require('./crud');
const analysis = require('./analysis');

const util = require('../common/utils');
const config = require('../common/config.js');

const sharadarUrl = 'https://data.nasdaq.com/api/v3/datatables/SHARADAR/TICKERS.json';
const indicators = [
    'ticker', 
    'name', 
    'exchange', 
    'isdelisted', 
    'sector', 
    'industry', 
    'scalemarketcap'
];
const params = {
    'api_key': config.quandl.api_key,
    'qopts.columns': indicators.toString()
};

const readObjFromJsonFile = (filename) => {
    const jsonData = require(`./${filename}`);
    return jsonData;
}

const saveObjToJsonFile = (obj, filename) => {
    const data = JSON.stringify(obj);
    fs.writeFileSync(filename, data);
}


const errorHandler = (err, reject) => {
    console.log('errorHandler', err);
    reject(err);
};


const successHandler = (result, resolve, reject) => {
    console.log('successHandler');
    if (!result) errorHandler('No Results.', reject);
    if (!result.datatable) errorHandler('No Datatable.', reject);

    const dataList = result.datatable.data || [];
    const columnsList = result.datatable.columns || [];
    if (!dataList.length) errorHandler('No Data.', reject);

    console.log(`datafound: ${dataList.length}`);

    const resultsMap = {};
    _.each(dataList, (payload, listIndex) => {
        const obj = {};
        _.each(payload, (item, index) => {
            const key = columnsList[index].name;
            const value = item;
            obj[key] = value;
        });
        if(obj.isdelisted === 'N') {
            // Only save non delisited companies
            resultsMap[obj.ticker] = obj;
        }
    });
    analysis.doAnalysis(resultsMap, 10);
    const results = _.values(resultsMap);
    resolve(results);
}

const getData = () => {
    console.log(`Getting metadata for ${params.date}`);
    return new Promise(( resolve, reject) => {
        util.getData(sharadarUrl, params, (err, res, body) => {
            if (err) {
                reject(err);
            }
            successHandler(body, resolve, reject);
        });
    })
}

const getTickers = () => {
    console.log(`Getting ticker list for ${params.date}`);
    return getData().then(results => {
        count = results.length;
        return results.map(ele => ele.ticker);
    }).catch(err => {
        console.log('Error getting tickers.');
    });
}

const getAllData = () => {
    console.log(`Getting ticker list for ${params.date}`);
    return getData().then(results => {
        return results;
    }).catch(err => {
        console.log('Error getting tickers.');
    });
}

const saveAllMetadata = () => {
    getAllData()
    .then(results => saveObjToJsonFile(results, 'tickerMetadata.json'))
    .catch(err => {
        console.log('Error getting tickers.', err);
    });
}

const saveTickerList = () => {
    getTickers()
    .then(results => saveObjToJsonFile(results, 'tickerList.json'))
    .catch(err => {
        console.log('Error getting tickers.', err);
    });
}

const test = () => {
    saveTickerList()
}

test();