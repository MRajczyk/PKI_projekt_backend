const express = require('express')
const router = express.Router()

const auth = require('./controllers/auth')
const { getUsers } = require("./controllers/users");

router.use((req, res, next) => {
  console.log('Time: ', Date.now())
  next()
})

router.get('/', (req, res) => {
  res.send('Hello world!')
})

router.get('/register', auth.createUser)
router.get('/login', auth.loginUser)

//secure router
router.get('/users/all', auth.accessTokenVerify, getUsers)

module.exports = router