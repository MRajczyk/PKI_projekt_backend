const express = require('express')
const router = express.Router()

const auth = require('./controllers/auth')

router.use((req, res, next) => {
  console.log('Time: ', Date.now())
  next()
})

router.get('/', (req, res) => {
  res.send('Hello world!')
})

router.get('/register', auth.createUser)

module.exports = router