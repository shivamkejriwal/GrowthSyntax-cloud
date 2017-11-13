const functions = require('firebase-functions');
const moment = require('moment');
const request = require('request');
const xml2json = require('xml2json');
const _ = require('underscore');
const querystring = require('querystring');
const cheerio = require('cheerio');
const crud = require('./crud');

const config = require('../common/config.js');

const author = 'vanguard.com';
const rssUrl = 'https://vanguardblog.com/category/economy-markets/feed/';
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

const getCategory = (categories) => {
    return 'Market and Economy';
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
    const article = {
        title : item.title,
        url: item.link,
        category: getCategory(item.category),
        date: moment(item.pubDate).format('YYYY-MM-DD-HH'),
        author: author
    };
    const options = {
        headers,
        url: getUrl(item.link),
        method: 'GET'
    };

    request(options, (err, res, body) => {
        if (!err) {
            const data = JSON.parse(body);
            article.content = extractHtml(data.content);
            done(article);
        }
    });
}


const execute = (complete) => {
    request(rssUrl, (err, res, body) => {
        const data = xml2json.toJson(body);
        const json = JSON.parse(data);
        const rss = json.rss;
        const items = rss.channel.item;
    
        const articles = [];
        const done = (article) => {
            console.log(article);
            articles.push(article);
            if (articles.length >= items.length){
                complete(articles);
            } 
        }

        _.each(items, (item) => loadRssData(item, done));    
    });
}

exports.load = functions.https.onRequest((request, response) => {
    execute((articles) => {
        const count = articles.length;
        crud.createBatch(articles)
        .then(res => {
            response.send(`Completed ${count} article loads`);
        }).catch(err => {
            response.send(`Error on articles for ${author}`);
        });
    });
});