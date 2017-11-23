const _ = require('underscore');
const util = require('../common/utils');

const db = util.getFirebaseDB();
const collection = db.collection('Videos');

const getDocument = (title) => collection.doc(title);;


const updateVideo = (title, data) => {
    const document = getDocument(title);
    return document.set(data);
}

const createVideo = (title, data) => {
    return updateVideo(title, data);
}


const readVideo = (title) => {
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

const deleteVideo = (title) => {
    const document = getDocument(title);
    return document.delete();
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
const createBatch = (dataList) => {
    
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
    create : createVideo,
    read: readVideo,
    update: updateVideo,
    delete: deleteVideo,
    createBatch
};
