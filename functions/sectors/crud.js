const _ = require('underscore');
const util = require('../common/utils');

const db = util.getFirebaseDB();

const getColllection = (type) => db.collection(type);
const getDocument = (type, name) => getColllection(type).doc(name);


const updateGroup = (data) => {
    console.log(`updateGroup (${data.type}): ${data.name}`);
    const document = getDocument(data.type, data.name);
    return document.update(data);
}

const createGroup = (data) => {
    console.log(`createGroup (${data.type}): ${data.name}`);
    const document = getDocument(data.type, data.name);
    return document.set(data);
}

const readGroup = (data) => {
    const document = getDocument(data.type, data.name);
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

const deleteGroup = (data) => {
    console.log(`deleteGroup (${data.type}): ${data.name}`);
    const document = getDocument(data.type, data.name);
    return document.delete();
}

const sendBatch = (dataList) => {
    var batch = db.batch();
    
    _.each(dataList, (data) => {
        const doc = getDocument(data.type, data.name);
        batch.set(doc, data);
        // batch.update(doc, data);
    });
    return batch.commit().then(() => {
        console.log('Batch Complete');
    });
}

/*
 * Takes a list of data in the format
 * [{ticker, date, price}, {ticker, date, price}, ...]
 */
const createBatch = (dataList) => {
    const type = dataList[0] && dataList[0].type;
    console.log(`Created entities (${type}):${dataList.length}`);
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
    create : createGroup,
    read: readGroup,
    update: updateGroup,
    delete: deleteGroup,
    createBatch
};