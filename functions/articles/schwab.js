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

const getCategory = (item, isMarketUpdate) => {
    if (isMarketUpdate) {
        return 'Stock Market Today';
    }
    const schwabCategory = item['schwab:taxonomy'] && item['schwab:taxonomy']['schwab:category'];
    const categoryStr = item.category || schwabCategory;
    return isValidCategory(categoryStr) ? 'Market and Economy' : false;
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
    try {
        const $ = cheerio.load(html);
        const links = $('a');
        $(links).each(function(i, link){
            const href = $(link).attr('href');
            const text = $(link).text();
            $(link).removeAttr("href");
        });
        return $.html();
    }
    catch (e) {
        console.log('could not extractHtml');
        return '';
    }
}

const loadRssData = (item, done) => {
    const isMarketUpdate = item.title.split(':')[0] === 'Schwab Market Update';
    const options = {
        headers,
        url: isMarketUpdate ? getUrl(dailyUpdateUrl) : getUrl(item.link),
        method: 'GET'
    };

    const article = {
        title : item.title,
        url: item.link,
        imageUrl: getImageUrl(item),
        category: getCategory(item, isMarketUpdate),
        date: moment(item.pubDate).format('YYYY-MM-DD-HH'),
        author: author
    };
    article.isValidCategory = !!article.category;
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