const _ = require('underscore');
const util = require('../common/utils');

const db = util.getFirebaseDB();
const collection = db.collection('Indicators');
const Prices = 'Prices';

const getDocument = (ticker) => collection.doc(ticker);

const fixData = (data) => {
    const keys = ['mostTraded', 'mostSold', 'mostBought'];
    _.each(keys, key => {
        data[key] = data[key] ? data[key] : false;
    });
}

let updateIndicator = (ticker, data) => {
    const document = getDocument(ticker);
    fixData(data);
    return document.update(data);
}

let createIndicator = (ticker, data) => {
    console.log(`createIndicator: ${ticker}`);
    const document = getDocument(ticker);
    fixData(data);
    return document.set(data);
}

let readIndicator = (ticker) => {
    const document = getDocument(ticker);
    return document.get()
        .then(doc => {
            if (!doc.exists) {
                console.log('No such document!');
            } else {
                return doc.data();
            }
        })
        .catch(err => {
            console.log('Error getting document', err);
        });
}

let deleteIndicator = (ticker) => {
    const document = getDocument(ticker);
    return document.delete();
}

let getList = (count) => {}


const sendBatch = (dataList) => {
    var batch = db.batch();
    
    _.each(dataList, (data) => {
        const doc = getDocument(data.ticker);
        fixData(data);
        batch.update(doc, data);
        // batch.set(doc, data);
    });
    return batch.commit()
    .then(() => {
        console.log('Batch Complete');
    }).catch(() => {
        console.log(`Attempting a smaller batch: ${dataList.length}`);
        if (dataList.length > 1) {
            return createBatch(dataList);
        }
        else {
            console.log('Attempting last Indicator');
            const data = dataList[0] || {};
            return createIndicator(data.ticker, data);
        }
        
    });
}

/*
 * Takes a list of data in the format
 * [{ticker, date, price}, {ticker, date, price}, ...]
 */
let createBatch = (dataList) => {
    
    console.log(`Created entities:${dataList.length}`);
    return new Promise((resolve, reject) => {
        let count = 0;
        let requestChain = [];
        const spliceSize = dataList.length > 500 
            ? 500 : Math.round( dataList.length * .10);
        while(dataList.length) {
            const batch = dataList.splice(0, spliceSize);
            requestChain.push(sendBatch(batch));
        }
        console.log(`Created requestChain:${requestChain.length}`);
        Promise.all(requestChain)
            .then((result) => {
                console.log('createBatch-Success');
                resolve(true);
            })
            .catch((err) => {
                console.log('createBatch-Error', err);
                reject(err);
            });
    });
}

module.exports = {
    create : createIndicator,
    read: readIndicator,
    update: updateIndicator,
    delete: deleteIndicator,
    list: getList,
    createBatch
};
