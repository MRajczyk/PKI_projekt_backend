const express = require('express')
const crypto = require('crypto');
const router = express.Router()

require('dotenv').config();
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI} = process.env;

const auth = require('./controllers/auth')
const axios = require('axios');
const { getUsers } = require("./controllers/users");
const { handleQuery } = require("./controllers/queryHandler");
const database = require("./controllers/database");

router.get('/', (req, res) => {
  res.send('Hello world!')
})

// router.use((req, res, next) => {
//   console.log('Time: ', Date.now())
//   next()
// })

router.post('/register', auth.createUser)
router.post('/login', auth.loginUser)
router.post('/refresh', auth.refreshTokenVerify);

//secure router
router.get('/users/all', auth.accessTokenVerify, getUsers)
router.post('/db/query', auth.accessTokenVerify, handleQuery)
router.get('/db', auth.accessTokenVerify, database.getCurrentDatabase)
router.get('/db/tables', auth.accessTokenVerify, database.getAllTables)
router.get('/db/table/:tableName', auth.accessTokenVerify, database.getTable)
router.get('/db/table_info/:tableName', auth.accessTokenVerify, database.getInfoAboutTable)

//OAUTH
router.get('/oauth/AuthPage',function(req,res){
  let state = crypto.randomBytes(16).toString('hex');
  res.cookie('XSRF-TOKEN', state);
  res.send({authUrl:"https://github.com/login/oauth/authorize?client_id="+CLIENT_ID+'&redirect_uri='+REDIRECT_URI+'&scope=read:user&allow_signup='+true+'&state='+state});
})

router.post('/oauth/getAccessToken',async function (req, res) {
    let state = req.headers["x-xsrf-token"];
    await axios({
        url: 'https://github.com/login/oauth/access_token?client_id=' + CLIENT_ID + '&client_secret=' + CLIENT_SECRET + '&code=' + req.body.code + '&redirect_uri=' + REDIRECT_URI + '&state=' + state,
        method: 'POST',
        headers: {'Accept': 'application/json'}
    }).then(async function (resp) {
        if (resp.data.access_token) {
            await axios({
                url: 'https://api.github.com/user',
                method: 'GET',
                headers: {'Authorization': "token " + resp.data.access_token}
            }).then(function (resp) {
                if(resp.data.email === null) {
                    return res.status(401).json({message: "Please set your email visible on github before proceeding"});
                }
                return res.status(200).json({data: resp.data});
            }).catch(function (err) {
                return res.status(401).json({data: resp.data});
            })
        } else {
            return res.status(401).json({data: resp.data});
        }
    }).catch(function (err) {
        return res.status(401).json({data: resp.data});
    })
})

module.exports = router