var blackrock = require('./blackrock');
var pimco = require('./pimco');
var valueline = require('./valueline');
var vanguard = require('./vanguard');
var schwab = require('./schwab');

module.exports = {
    blackrock,
    pimco,
    valueline,
    vanguard,
    schwab
};


// https://www.personalcapital.com/blog/feed/json/
// https://www.gsam.com/content/gsam/referencenodes/filterandlist.json/pagePath$/content/gsam/us/en/advisors/market-insights/market-strategy/all-insights.html$filters$filter-topics:ideas-and-insights/macro-outlook/query.json
// https://www.gsam.com/content/gsam/referencenodes/filterandlist.json/pagePath$/content/gsam/us/en/advisors/market-insights/market-strategy/all-insights.html$filters$page-type:economy-and-markets/market-monitor/query.json