const functions = require('firebase-functions');
const moment = require('moment');
const request = require('request');
const xml2json = require('xml2json');
const _ = require('underscore');
const querystring = require('querystring');
const cheerio = require('cheerio');
const crud = require('./crud');

const config = require('../common/config.js');

const author = 'schwab.com';
const marketUpdatesUrl = 'http://feeds.schwab.com/rss/schwab_market_update';
const investingInsightsUrl = 'http://feeds.schwab.com/rss/market_investing_insights';
const dailyUpdateUrl = 'https://www.schwab.com/resource-center/insights/content/schwab-market-update';

const mercuryUrl = 'https://mercury.postlight.com/parser?';
const headers = {
    'Content-Type': 'application/json',
    'x-api-key': config.mercury.api_key
}


const getUrl = (url) => {
    const params = { url };
    const qs = querystring.stringify(params);
    return `${mercuryUrl}${qs}`;
}

const getCategory = (categoryStr) => {
    // const categoryList = categoryStr.split(',');
    const maps = {
        'Market Commentary': 'Market and Economy',
        'Economy': 'Market and Economy',
        'Markets': 'Market and Economy',
        'Government Policy': 'Market and Economy',
        'Planning': 'Personal Finance',
        'Personal Finance': 'Personal Finance',
        'Education Savings': 'Personal Finance',
        '401k': 'Personal Finance',
        'Retirement - Nearing or in': 'Personal Finance',
        'Retirement': 'Personal Finance',
        'Estate': 'Personal Finance',
        'Wills': 'Personal Finance'
    }
    return maps[categoryStr] ? maps[categoryStr] : categoryStr;
}

const isValidCategory = (categoryStr) => {
    const vetoList = [
        'Planning',
        'Personal Finance',
        'Investing Basics',
        'Education Savings',
        'Setting Goals',
        'Portfolio Management',
        'Asset Allocation',
    ];

    const acceptList = [
        'Market Commentary',
        'Stock Market Today',
        'Government Policy',
        'Economy',
        'Markets'
    ];
    if (!categoryStr || typeof categoryStr !== 'string') {
        return false;
    }
    const categoryList = _.map(categoryStr.split(','), val => val.trim());
    const isValid = _.some(categoryList, category => _.contains(acceptList, category));
    const isVetoed = _.some(categoryList, category => _.contains(vetoList, category));
    return isValid && !isVetoed;
}

const getImageUrl = (item) => {
    return '';
}

const htmlToString = (html) => {
    const $ = cheerio.load(html);
    const text = $.text();
    const noTrailingSpace = text.trim();
    const noExtraLines = noTrailingSpace.replace(/\n\n\n/g, '');
    return noExtraLines;
}

const extractHtml = (html) => {
    const $ = cheerio.load(html);
    const links = $('a');
    $(links).each(function(i, link){
        const href = $(link).attr('href');
        const text = $(link).text();
        $(link).removeAttr("href");
    });
    return $.html();
}

const loadRssData = (item, done) => {
    const schwabCategory = item['schwab:taxonomy'] && item['schwab:taxonomy']['schwab:category'];
    const category = item.category || schwabCategory;

    // console.log({
    //     title: item.title,category,
    // });
    const article = {
        title : item.title,
        url: item.link,
        imageUrl: getImageUrl(item),
        category: getCategory(category),
        date: moment(item.pubDate).format('YYYY-MM-DD-HH'),
        author: author
    };
    const options = {
        headers,
        url: getUrl(item.link),
        method: 'GET'
    };
    if (article.title.split(':')[0] === 'Schwab Market Update') {
        options.url = getUrl(dailyUpdateUrl);
        article.category = 'Stock Market Today';
    }
    article.isValidCategory = isValidCategory(article.category);
    // if (!article.isValidCategory) {
    //     console.log({
    //         title: article.title,
    //         category: article.category,
    //     });
    // }

    request(options, (err, res, body) => {
        if (!err) {
            const data = JSON.parse(body);
            article.content = extractHtml(data.content);
            done(article);
        }
    });
}


const getData = (url) => {
    return new Promise((resolve, reject) => {
        request(url, (err, res, body) => {
            try {
                const data = xml2json.toJson(body);
                const json = JSON.parse(data);
                const rss = json.rss;
                const items = rss.channel.item;
                let skipped = 0;
                let total = items.length;
                const articles = [];
                const done = (article) => {
                    if (article.isValidCategory) {
                        delete article.isValidCategory;
                        articles.push(article);
                    }
                    else {
                        skipped++;
                    }
                    
                    const count = articles.length + skipped;
                    // console.log({
                    //     count, skipped
                    // });
                    if (count >= total){
                        resolve(articles);
                    } 
                }
                if (_.isArray(items)) {
                    _.each(items, (item) => loadRssData(item, done)); 
                }
                else {
                    total = 1;
                    loadRssData(items, done);
                }
            }
            catch (e) {
                reject(e);
            }
               
        });
    });
}

const execute = () => {
    return Promise.all([
        getData(marketUpdatesUrl),
        getData(investingInsightsUrl)
    ])
    .then(results => {
        const articles = [];
        _.each(results[0], result => articles.push(result));
        _.each(results[1], result => articles.push(result));
        console.log({
            updates: results[0].length,
            insights: results[1].length,
            articles: articles.length
        });
        return articles;
    })
    .catch(err => console.log(err));
}

const test = () => {
    execute()
    .then(articles => {
        const count = articles.length;
        return crud.createBatch(articles)
        .then(res => {
            console.log(`Completed ${count} article loads`);
        }).catch(err => {
            console.log(`Error on articles for ${author}`);
        });
    });
}


exports.load = functions.https.onRequest((request, response) => {
    execute().then((articles) => {
        const count = articles.length;
        crud.createBatch(articles)
        .then(res => {
            response.send(`Completed ${count} article loads`);
        }).catch(err => {
            response.send(`Error on articles for ${author}`);
        });
    });
});


// test();