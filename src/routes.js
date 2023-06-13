const express = require('express')
const router = express.Router()

const auth = require('./controllers/auth')
const { getUsers } = require("./controllers/users");
const { handleQuery } = require("./controllers/queryHandler");
const database = require("./controllers/database");

router.get('/', (req, res) => {
  res.send('Hello world!')
})
//
// router.use((req, res, next) => {
//   console.log('Time: ', Date.now())
//   next()
// })

router.post('/register', auth.createUser)
router.post('/login', auth.loginUser)
router.post('/auth/refresh', auth.refreshTokenVerify);

//secure router
router.get('/users/all', auth.accessTokenVerify, getUsers)
router.get('/query', auth.accessTokenVerify, handleQuery)
router.get('/db', auth.accessTokenVerify, database.getCurrentDatabase)
router.get('/db/tables', auth.accessTokenVerify, database.getAllTables)

module.exports = router