const router = require('./routes')
const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require("cookie-parser");
const cors = require('cors')
const app = express()
const port = 3000

require('dotenv').config();
const pool = require('./util/db')
const bcrypt = require("bcrypt");

app.use(cors())
app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
)

app.use(cookieParser());
app.use('/', router)

async function getPostgresVersion() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT version()');
    console.log(res.rows[0]);
  }
  finally {
    client.release();
  }
}
getPostgresVersion();

const SALT_ROUNDS = 10
async function superUserInit() {
  const { ADMIN_DEFAULT_PASSWORD } = process.env;
  const client = await pool.connect();
  try {
    const res = await client.query('select COUNT(email) from "users" where email=\'admin@admin\' and username=\'admin\'');
    if(res.rows[0].count === '0') {
      await client.query('insert into Users(username, password, email, role) values ($1, $2, $3, \'admin\')', ['admin', bcrypt.hashSync(ADMIN_DEFAULT_PASSWORD, SALT_ROUNDS), 'admin@admin'])
      console.log('created admin with default password');
    }
  }
  finally {
    client.release();
  }
}
superUserInit();

app.listen(port, () => {
  console.log('Listening at port ' + port);
})