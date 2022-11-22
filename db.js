const { MongoClient } = require('mongodb')

let dbCommunityNftConnection;
let dbCommunityCommentsConnection;


module.exports =
{
    connectToCommunnityNftDb: (cb) => {
        MongoClient.connect(URL_COMMUNITY_NFTS)
            .then((client) => {
                dbCommunityNftConnection = client.db();
                return cb(null)
            })
            .catch((err) => {
                console.log(err);
                return cb(err)
            })
    },
    getCommunityNftDb: () => dbCommunityNftConnection,

    connectToCommunityCommentsDb: (cb) => {
        MongoClient.connect(URL_COMMUNITY_COMMENTS)
            .then((client) => {
                dbCommunityCommentsConnection = client.db();
                return cb(null)
            })
            .catch((err) => {
                console.log(err);
                return cb(err)
            })
    },
    getCommunityCommentsDb: () => dbCommunityCommentsConnection
}