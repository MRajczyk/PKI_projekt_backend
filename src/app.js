const router = require('./routes')
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const app = express()
const port = 3000

const { Pool } = require('pg');
require('dotenv').config();

app.use(cors())
app.use(bodyParser.json())
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
)

app.use('/', router)

const { DATABASE_URL } = process.env;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function getPostgresVersion() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT version()');
    console.log(res.rows[0]);
  } finally {
    client.release();
  }
}

getPostgresVersion();

app.listen(port, () => {
  console.log('Listening at port ' + port);
})