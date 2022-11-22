const express = require('express');
const { connectToCommunityCommentsDb, connectToCommunnityNftDb, getCommunityCommentsDb, getCommunityNftDb } = require('./db');
const { MongoClient, ObjectId } = require('mongodb');
const db = require('./db');
const { query } = require('express');
const nfteyez = require('@nfteyez/sol-rayz');
const web3js = require('@solana/web3.js');
const bs58 = require('bs58');
const our_connection = new web3js.Connection('');
let db_community_nfts;
let db_community_comments;
const app = express();

let successResponse = {
    status: "success"
}
let failureResponse = {
    status: "failure"
}

app.use(express.json());

connectToCommunnityNftDb((err) => {
    if (!err) {
        connectToCommunityCommentsDb(err => {
            if (!err) {
                app.listen(process.env.PORT || 4000, () => {
                    console.log("listening on port 4000 ... ")
                })
                db_community_comments = getCommunityCommentsDb();
                db_community_nfts = getCommunityNftDb();


            }
        })

    } else {
        console.log("???????????????????? : " + err);
        return;

    }
})



// GET ALL COMMUNITY NFTS (PAGINATED)
app.get('/community_nfts', (req, res) => {


    /*
        sort
        if(objectid!= null) -> do stuff  
        last query item {
            recent : time
            top : likes
        }
    */
    let search_options;
    let find_options;
    let last;
    if (req.query.last != "none") {
        if (!ObjectId.isValid(req.query.objectId)) {
            res.status(404).json(failureResponse)
            return;
        }
        try {
            last = parseInt(req.query.last);
        } catch (e) {
            res.status(404).json(failureResponse)
            return;
        }
    }

    switch (req.query.sort) {
        case "recent":
            search_options = { created_At: -1, _id: 1 };

            if (req.query.last != "none") {
                find_options = {
                    $or: [
                        { created_At: { $lt: last } },
                        {
                            created_At: last,
                            _id: { $gt: ObjectId(req.query.objectId) }
                        }
                    ]
                }
            }

            break;
        case "top_weekly":
            search_options = { likesCount: -1, _id: 1 };

            if (req.query.last != "none") {
                find_options = {
                    $and: [
                        { created_At: { $gt: Date.now() - 604800000 } },
                        {
                            $or: [
                                { likesCount: { $lt: last } },
                                {
                                    likesCount: last,
                                    _id: { $gt: ObjectId(req.query.objectId) }
                                }
                            ]
                        }
                    ]
                }
            } else {

                find_options = { created_At: { $gt: Date.now() - 604800000 } };

            }
            break;
        case "top_monthly":
            search_options = { likesCount: -1, _id: 1 };


            if (req.query.last != "none") {
                find_options = {
                    $and: [
                        { created_At: { $gt: Date.now() - 2629800000 } },
                        {
                            $or: [
                                { likesCount: { $lt: last } },
                                {
                                    likesCount: last,
                                    _id: { $gt: ObjectId(req.query.objectId) }
                                }
                            ]
                        }
                    ]
                }
            } else {
                find_options = { created_At: { $gt: Date.now() - 2629800000 } };
            }

            break;
        case "top_all_time":
            search_options = { likesCount: -1, _id: 1 };

            if (req.query.last != "none") {
                find_options = {
                    $or: [
                        { likesCount: { $lt: last } },
                        {
                            likesCount: last,
                            _id: { $gt: ObjectId(req.query.objectId) }
                        }
                    ]
                }
            }

            break;
        default:
            search_options = { created_At: -1 };
            break;
    }

    let items_per_page = 20;


    let nfts = []

    db_community_nfts.collection('community_nfts')
        //todo fix 
        .find(find_options)
        .sort(search_options)          // ascending order ????
        .limit(items_per_page)
        .forEach(nft => {

            let item = {
                _id: nft._id,
                image: nft.image,
                metadata: nft.metadata,
                likesCount: nft.likesCount,
                creator: nft.creator,
                created_At: nft.created_At,
                user_liked: false
            }

            if (req.query.address && req.query.address != "lmao") {
                for (let i = 0; i < nft.likes.length; i++) {
                    if (req.query.address == nft.likes[i]) {
                        item.user_liked = true;
                        break;
                    }
                }
            }


            nfts.push(item);
        })
        .then(() => {
            res.status(200).json(nfts);
        })
        .catch((err) => {
            console.log(err)
            res.status(503).json(failureResponse);

        })


})

// INCREMENT LIKES/DISLIKES ON A COMMUNITY NFT
app.patch('/community_nfts/:id', (req, res) => {



    db_community_nfts.collection('community_nfts')
        .findOne({ _id: ObjectId(req.params.id), likes: req.body.pubKey })
        .then((result) => {

            if (result == null) {

                //insert pupkey into 
                db_community_nfts.collection('community_nfts')
                    .updateOne({ _id: ObjectId(req.params.id) }, { $addToSet: { likes: req.body.pubKey }, $inc: { likesCount: 1 } })
                    .then(() => {

                        res.status(200).json(successResponse);
                    })
                    .catch((err) => {
                        console.log(err)
                        res.status(404).json(failureResponse);
                    })

            } else {
                console.log("should be here")
                //insert pupkey into 
                db_community_nfts.collection('community_nfts')
                    .updateOne({ _id: ObjectId(req.params.id) }, { $pull: { likes: req.body.pubKey }, $inc: { likesCount: -1 } })
                    .then(() => {
                        console.log("should be here okkkkkkkkkk")
                        res.status(200).json(successResponse);
                    })
                    .catch((err) => {
                        console.log(err)
                        res.status(404).json(failureResponse);
                    })

            }
        })
        .catch((err) => {
            console.log(err);
            res.status(404).json(failureResponse);
        })


})

// GET ALL COMMENTS ON 1 COMMUNITY NFT (PAGINATED)
app.get('/community_comments/:id', (req, res) => {

    // get user emotes
    // number of emotes per emoji   
    let page = req.query.p || 0;
    let items_per_page = 20;
    let comments = [];
    db_community_comments.collection(req.params.id)
        .find()
        .sort({ created_At: - 1 })          // ascending order ????
        .skip(page * items_per_page)
        .limit(items_per_page)
        .forEach(comment => {
            let one = {
                _id: comment._id,
                address: comment.address,
                comment: comment.comment,
                created_At: comment.created_At,
                emojis: [],
            };

            if (req.query.pubKey != null && req.query.pubKey != "lmao") {
                for (let i = 0; i < comment.emojis.length; i++) {
                    one.emojis.push({
                        id: comment.emojis[i].id,
                        count: comment.emojis[i].count,
                        user_liked: false
                    })
                    for (let j = 0; j < comment.emojis[i].pubKeys.length; j++) {


                        if (comment.emojis[i].pubKeys[j] === req.query.pubKey) {
                            one.emojis[i].user_liked = true;
                            break;
                        }
                    }


                }
            } else {
                for (let i = 0; i < comment.emojis.length; i++) {
                    one.emojis.push({
                        id: comment.emojis[i].id,
                        count: comment.emojis[i].count,
                        user_liked: false
                    })
                }
            }
            comments.push(one);

        })
        .then((result) => {
            res.status(200).json(comments);
        })
        .catch((err) => {
            console.log(err);
            res.status(503).json(failureResponse);

        })
})

// POST NEW COMMENT ON COMMUNITY NFT 
app.post('/community_comments/:id', (req, res) => {


    if (!req.body || req.body.comment == "" || !req.body.comment || !req.body.address || !req.body.created_At) {
        res.status(500).json(failureResponse)

    } else {
        req.body.emojis = [];
        db_community_comments.collection(req.params.id)
            .insertOne(req.body)          // ascending order ????
            .then((response) => {

                res.status(200).json({
                    _id: new ObjectId(response.insertedId).toString()
                });
            })
            .catch((err) => {
                console.log(err)
                res.status(503).json(failureResponse);

            })
    }
})


/*POST EMOJI ON COMMUNITY NFT

ORRR
{
    id:"emoji_1"
    pubKey :"Asdasdkjasldjas"
 
}

*/


//UPDATE EMOJIS ON A COMMENT

app.post('/community_comments/emoji/:collection_id/:comment_id', (req, res) => {

    db_community_comments.collection(req.params.collection_id)
        .findOne({ _id: ObjectId(req.params.comment_id), "emojis.id": req.body.id })
        .then(result => {
            console.log(result);

            if (result === null) {

                db_community_comments.collection(req.params.collection_id)
                    .updateOne({ _id: ObjectId(req.params.comment_id) }, { $push: { emojis: { id: req.body.id, pubKeys: [req.body.pubKey], count: 1 } } })
                    .then(result => {

                        res.status(200).json(successResponse);
                    })
                    .catch(err => {
                        res.status(500).json(failureResponse);

                    })
            } else {
                let bool = false;
                for (let i = 0; i < result.emojis.length; i++) {
                    if (result.emojis[i].id == req.body.id) {
                        for (let k = 0; k < result.emojis[i].pubKeys.length; k++) {
                            if (result.emojis[i].pubKeys[k] == req.body.pubKey) {
                                bool = true;
                                break;
                            }
                        }
                        break;
                    }
                }
                if (!bool) {
                    //add to users

                    db_community_comments.collection(req.params.collection_id)
                        .updateOne({ _id: ObjectId(req.params.comment_id) }, { $addToSet: { "emojis.$[i].pubKeys": req.body.pubKey }, $inc: { "emojis.$[i].count": 1 } }, { arrayFilters: [{ 'i.id': req.body.id }] })
                        .then(result => {

                            res.status(200).json(successResponse)

                        })
                        .catch(err => {
                            console.log(err)
                            res.status(500).json(failureResponse);

                        })
                } else {
                    //remove from users
                    db_community_comments.collection(req.params.collection_id)
                        .updateOne({ _id: ObjectId(req.params.comment_id) }, { $pull: { "emojis.$[i].pubKeys": req.body.pubKey }, $inc: { "emojis.$[i].count": -1 } }, { arrayFilters: [{ 'i.id': req.body.id }] })
                        .then(result => {
                            db_community_comments.collection(req.params.collection_id)
                                .updateOne({ _id: ObjectId(req.params.comment_id) }, { $pull: { "emojis": { "count": 0 } } })
                                .then((result) => {

                                    res.status(200).json(successResponse)
                                })
                                .catch((err) => {
                                    res.status(500).json(failureResponse);
                                })

                        })
                        .catch(err => {
                            res.status(500).json(failureResponse);

                        })
                }
            }
        })
        .catch(err => {
            res.status(500).json(failureResponse);
        })

})

// get wallet NFTs 

app.get('/getWalletNfts', (req, res) => {

    let decoded = bs58.decode(req.query.address)
    if (decoded.length != 32) {
        res.status(400).json(invalidError);
    } else {
        nfteyez.getParsedNftAccountsByOwner({
            publicAddress: req.query.address,
            connection: our_connection,
        }).then((result) => {
            console.log(result);
            res.status(200).json(result);
        }).catch((err) => {
            console.log(err)
            res.status(400).json(failureResponse);
        })
    }
});



