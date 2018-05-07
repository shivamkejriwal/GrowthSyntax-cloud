const functions = require('firebase-functions');
const _ = require('underscore');
const csv = require('csv');
const crud = require('./crud');
const analysis = require('./analysis');

const util = require('../common/utils');
const config = require('../common/config.js');

const sharadarUrl = 'https://www.quandl.com/api/v3/datatables/SHARADAR/SEP.json';
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

const errorHandler = (err, reject) => {
    console.log('errorHandler', err);
    reject(err);
};

const getNasdaqExchangeData = (exchange) => {
    const profiles = {};
    const successHandler = (body, resolve, reject) => {
        // console.log('sectors:getNasdaqUrlData - successHandler');
        csv.parse(body, (err, data) => {
            _.each(data, ele => {
                const company = {
                    ticker: ele[0],
                    price: ele[2],
                    sector: ele[5],
                    industry: ele[6]
                }
                profiles[company.ticker] = company;
            }); 
        });
        resolve(profiles);
    }
    const options = {
        exchange,
        render: `download`
    }
    return new Promise((resolve, reject) => {
        util.getData(nasdaqUrl, options, (err, res, body) => {
            if (err) {
                errorHandler(err, reject);
            }
            successHandler(body, resolve, reject);
        });
    })
}

const getNasdaqProfileData = () => {
    return Promise.all([
        getNasdaqExchangeData(exchanges[0]),
        getNasdaqExchangeData(exchanges[1]),
        getNasdaqExchangeData(exchanges[2])
    ]).then(results => {
        let profiles = {};
        _.each(results, profile => {
            profiles = _.extend(profiles, profile);
        });
        console.log(`Profiles Count: ${_.keys(profiles).length}`);
        return profiles
    });
}

const getSharadarProfileData = () => {
    const successHandler = (result, onComplete) => {
        console.log('sectors:getProfileData - successHandler');
        const data = {};
        _.each(result, (company) => {
            if (!company['Delisted From']) {
                const profile = {
                    name: company.Name,
                    ticker: company.Ticker,
                    location: company.Location,
                    sector: company.Sector,
                    industry: company.Industry
                }
                data[profile.ticker] = profile;
            }
        });
        console.log(`Profile data found for ${_.keys(data).length} companies`);
        onComplete(data);
    }

    return new Promise((resolve, reject) => {
        util.getData(sharadarMetaUrl, {}, (err, res, body) => {
            if (err) {
                errorHandler(err, reject);
            }
            successHandler(body, resolve);
        });
    });
}

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

const execute = (profileSource) => {
    const getProfileData = (profileSource === 'sharadar') 
        ? getSharadarProfileData : getNasdaqProfileData;
    const counts = {};

    return Promise.all([
        getProfileData(),
        getPriceData()
    ]).then(results => {
        const profile = results[0];
        const prices = results[1];
        console.log('results', {
            profile: _.keys(profile).length,
            prices: prices.length
        });
        const sectors = _.values(getGroupingData('sector', profile, prices));
        const industries = _.values(getGroupingData('industry', profile, prices));
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
    // execute('sharadar')
    execute('').then(results => {
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
