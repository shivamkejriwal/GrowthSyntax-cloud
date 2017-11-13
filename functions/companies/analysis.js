const _ = require('underscore');
const util = require('../common/utils');

const build = (resultsMap) => {
    const dataset = _.values(resultsMap);
    const companies = [];
    _.each(dataset, (item) => {
        const change = util.round(item.close - item.open, 2);
        const totalVolume = util.round(item.open * item.volume, 2);
        const totalChange = util.round(change * item.volume, 2);
        companies.push({
            ticker: item.ticker,
            totalVolume,
            totalChange,
            change
        });
    });
    return companies;
}

const populateKey = (resultsMap, list, key) => {
    _.each(list, item => {
        resultsMap[item.ticker][key] = true;
    });
}

const populateValue = (resultsMap, list, key) => {
    _.each(list, item => {
        resultsMap[item.ticker][key] = item[key];
    });
}

const doAnalysis = (resultsMap, limit) => {
    const companies = build(resultsMap);
    const sortedByVolume = _.sortBy(companies, 'totalVolume');
    const sortedByChange = _.sortBy(companies, 'totalChange');
    const mostTraded = _.last(sortedByVolume, limit);
    const mostSold = _.first(sortedByChange, limit);
    const mostBought = _.last(sortedByChange, limit);
    populateKey(resultsMap, mostTraded, 'mostTraded');
    populateKey(resultsMap, mostSold, 'mostSold');
    populateKey(resultsMap, mostBought, 'mostBought');
}

module.exports = {
    doAnalysis
}; 