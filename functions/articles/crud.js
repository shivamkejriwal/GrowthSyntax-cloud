const _ = require('underscore');
const util = require('../common/utils');

const db = util.getFirebaseDB();
const collection = db.collection('Articles');

const getDocument = (title) => collection.doc(title);;


let updateArticle = (title, data) => {
    const document = getDocument(title);
    return document.set(data);
}

let createArticle = (title, data) => {
    return updateArticle(title, data);
}


let readArticle = (title) => {
    const document = getDocument(title);
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

let deleteArticle = (title) => {
    const document = getDocument(title);
    return document.delete();
}

let getList = (count) => {
    // let limit = count ? count : 1;
    // const query = datastore.createQuery(kind)
    //     .limit(limit);
    // // TO DO: add better filters

    // return datastore.runQuery(query)
    //     .then((results) => {
    //         const entities = results[0];
    //         return entities;
    //     });
}


const sendBatch = (dataList) => {
    var batch = db.batch();
    
    _.each(dataList, (data) => {
        const doc = getDocument(data.title);
        batch.set(doc, data);
    });
    return batch.commit().then(() => {
        console.log('Batch Complete');
    });
}

/*
 * Takes a list of data in the format
 * [{title, date, price}, {title, date, price}, ...]
 */
let createBatch = (dataList) => {
    
    console.log(`Created entities:${dataList.length}`);
    return new Promise((resolve, reject) => {
        let count = 0;
        let requestChain = [];
        while(dataList.length) {
            const batch = dataList.splice(0,500);
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
    create : createArticle,
    read: readArticle,
    update: updateArticle,
    delete: deleteArticle,
    list: getList,
    createBatch
};
