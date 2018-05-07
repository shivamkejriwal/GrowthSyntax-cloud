const functions = require('firebase-functions');
const moment = require('moment');
const request = require('request');
const xml2json = require('xml2json');
const _ = require('underscore');
const querystring = require('querystring');
// const cheerio = require('cheerio');
const crud = require('./crud');

const config = require('../common/config.js');

const youtubeFeedsURl = 'https://www.youtube.com/feeds/videos.xml'
const mercuryUrl = 'https://mercury.postlight.com/parser?';
const headers = {
    'Content-Type': 'application/json',
    'x-api-key': config.mercury.api_key
}

// CME Daily Market Commentary
// https://www.youtube.com/playlist?list=PLkJQh4MWlJkvcFtOFrXkiwidJ2CyAfa1A
// Goldman Sachs Macroeconomic Insights
// https://www.youtube.com/playlist?list=PLIyiGQywEp66ix2-fgljBBW87iIX6C3G2


const feeds = [
    {
        publisher: 'morningstar.com',
        category: 'Stock Highlights',
        playlistId: 'PLdHNrgBvsSFTKV8dgtz-2QyXKmRC2RQo1'
        // url: 'https://www.youtube.com/feeds/videos.xml?playlist_id=PLdHNrgBvsSFTKV8dgtz-2QyXKmRC2RQo1'
    },
    {
        publisher: 'morningstar.com',
        category: 'Economic Outlook',
        playlistId: 'PLdHNrgBvsSFRL9ugOpmfdnPBF4kxi6PgJ'
        // url: 'https://www.youtube.com/feeds/videos.xml?playlist_id=PLdHNrgBvsSFRL9ugOpmfdnPBF4kxi6PgJ'
    },
    {
        publisher: 'schwab.com',
        category: 'Market Snapshot',
        playlistId: 'PLctx2TLOKMwaUkHbrpnIrnmK34i4zBGuq'
        // url: 'https://www.youtube.com/feeds/videos.xml?playlist_id=PLctx2TLOKMwaUkHbrpnIrnmK34i4zBGuq'
    },
    {
        publisher: 'barrons.com',
        category: 'Market Snapshot',
        playlistId: 'PLqQNt9DP_BNCy3ugmQulFTM0Lz3qxxVr1'
        // url: 'https://www.youtube.com/feeds/videos.xml?playlist_id=PLqQNt9DP_BNCy3ugmQulFTM0Lz3qxxVr1'
    }
];

const getVideo = (feed, item) => {
    const author = item.author.name;
    const date = moment(item.published).format('YYYY-MM-DD-HH');
    const thumbnail = item['media:group']['media:thumbnail'].url;
    // const description = item['media:group']['media:description'];
    const link = item.link.href;
    const videoId = item['yt:videoId'];

    return {
        category: feed.category,
        publisher: feed.publisher,
        title: item.title,
        author,
        date,
        thumbnail,
        // description,
        link,
        videoId
    };
}

const getData = (feed) => {
    const rssUrl = `${youtubeFeedsURl}?playlist_id=${feed.playlistId}`;

    return new Promise(( resolve, reject) => {
        request(rssUrl, (err, res, body) => {
            if (err) {
                reject(err);
            }
            const data = xml2json.toJson(body);
            const json = JSON.parse(data);
            const items = json.feed.entry;
            const videos = _.map(items, item => getVideo(feed, item));
            resolve(videos);
        });
    });
}

const execute = () => {
    const promiseChain = _.map(feeds, feed => getData(feed));
    const videos = [];
    return Promise.all(promiseChain)
    .then(results => {
        _.each(results, result => {
            _.each(result, video => videos.push(video));
        });
        return videos;
    })
    .catch(err => console.log(err));;
};

const test = () => {
    let count = 0;
    execute().then(videos => {
        count = videos.length;
        crud.createBatch(videos)
        .then(res => {
            console.log(`Completed ${count} video loads.`);
        }).catch(err => {
            console.log('Error on loading videos');
        });
    });
};

exports.load = functions.https.onRequest((request, response) => {
    let count = 0;
    execute().then(videos => {
        count = videos.length;
        crud.createBatch(videos)
        .then(res => {
            response.send(`Completed ${count} video loads.`);
        })
        .catch(err => {
            response.send('Error on loading videos');
        });
    });
});

// test();