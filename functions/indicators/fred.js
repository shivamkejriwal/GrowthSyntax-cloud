// =====
// Daily
// =====

// Effective Federal Funds Rate
// https://www.quandl.com/api/v3/datasets/FRED/DFF.json?api_key=zbJ7Hr8jdBZaxAXg9KTR&start_date=2018-02-03

// Bank Prime Loan Rate
// https://www.quandl.com/api/v3/datasets/FRED/DPRIME.json?api_key=zbJ7Hr8jdBZaxAXg9KTR

// =======
// Monthly
// =======

// Civilian Unemployment Rate
// https://www.quandl.com/api/v3/datasets/FRED/UNRATE.json?api_key=zbJ7Hr8jdBZaxAXg9KTR

// Unemployment Rate for United States
// https://www.quandl.com/api/v3/datasets/FRED/M0892CUSM156NNBR.json?api_key=zbJ7Hr8jdBZaxAXg9KTR&start_date=1966-06-01

// Civilian Labor Force Participation Rate
// https://www.quandl.com/api/v3/datasets/FRED/CIVPART.json?api_key=zbJ7Hr8jdBZaxAXg9KTR

// All Employees: Total Nonfarm Payrolls
// https://www.quandl.com/api/v3/datasets/FRED/PAYEMS.json?api_key=zbJ7Hr8jdBZaxAXg9KTR

// Personal Saving Rate
// https://www.quandl.com/api/v3/datasets/FRED/PSAVERT.json?api_key=zbJ7Hr8jdBZaxAXg9KTR

// Disposable Personal Income
// https://www.quandl.com/api/v3/datasets/FRED/DSPI.json?api_key=zbJ7Hr8jdBZaxAXg9KTR

// Capacity Utilization: Total Industry
// https://www.quandl.com/api/v3/datasets/FRED/TCU.json?api_key=zbJ7Hr8jdBZaxAXg9KTR&start_date=2013-03-01

// Average Hourly Earnings of All Employees: Total Private
// https://www.quandl.com/api/v3/datasets/FRED/CES0500000003.json?api_key=zbJ7Hr8jdBZaxAXg9KTR

// Consumer Price Index - USA
// https://www.quandl.com/api/v3/datasets/RATEINF/CPI_USA.json?api_key=zbJ7Hr8jdBZaxAXg9KTR

// =========
// Quarterly
// =========

// Corporate Profits After Tax
// https://www.quandl.com/api/v3/datasets/FRED/CP.json?api_key=zbJ7Hr8jdBZaxAXg9KTR

// Gross Private Domestic Investment
// https://www.quandl.com/api/v3/datasets/FRED/GPDI.json?api_key=zbJ7Hr8jdBZaxAXg9KTR

const _ = require('underscore');
const util = require('../common/utils');
const config = require('../common/config.js');

const baseFredUrl = 'https://www.quandl.com/api/v3/datasets/FRED';
const params = {
    'api_key': config.quandl.api_key,
    'start_date': util.getLastYear(),
    'end_date': util.getDay()
};
const quandlCode = {
    // Daily
    'Effective Federal Funds Rate': 'DFF',
    'Bank Prime Loan Rate': 'DPRIME',

    // Monthly
    'Civilian Unemployment Rate':'UNRATE',
    'Unemployment Rate for United States': 'M0892CUSM156NNBR',
    'Civilian Labor Force Participation Rate': 'CIVPART',
    'All Employees - Total Nonfarm Payrolls': 'PAYEMS',
    'Personal Saving Rate': 'PSAVERT',
    'Disposable Personal Income': 'DSPI',
    'Capacity Utilization - Total Industry': 'TCU',
    'Average Hourly Earnings of All Employees - Total Private': 'CES0500000003',
    // 'Consumer Price Index - USA': 'CPI_USA',

    // Quarterly
    'Corporate Profits After Tax': 'CP',
    'Gross Private Domestic Investment': 'GPDI'
};

const createUrl = (code) => `${baseFredUrl}/${code}.json?`;

const errorHandler = (err, reject) => {
    console.log('errorHandler', err);
    reject(err);
};


const successHandler = (result, resolve, reject) => {
    console.log('successHandler', {result});
    if (!result) errorHandler('No Results.', reject);
    if (!result.dataset) errorHandler('No dataset.', reject);
    if (!result.dataset.data) errorHandler('No data.', reject);
    const data = result && result.dataset
                && result.dataset.data;

    resolve(results);
}


const getData = (indicator) => {
    const code = quandlCode[indicator] || '';
    console.log(`Getting data for ${code}`, params);

    const url = createUrl(code);
    return new Promise(( resolve, reject) => {
        util.getData(url, params, (err, res, body) => {
            if (err) {
                reject(err);
            }
            successHandler(body, resolve, reject);
        });
    })
}

getData('Civilian Unemployment Rate');