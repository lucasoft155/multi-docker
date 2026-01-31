const keys = require('./keys');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres Client Setup
const { Pool } = require('pg');
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort,
    ssl:
      process.env.NODE_ENV !== 'production'
        ? false
        : { rejectUnauthorized: false },
  });
  /* pgClient.on("error", (err) => console.error(`Lost Postgres connection: ${err}`)); */

  pgClient.on("connect", (client) => {
    client
      .query("CREATE TABLE IF NOT EXISTS values (number INT)")
      .catch((err) => console.error(err));
  });

// Redis Client Setup
const redis = require('redis');
const redisClient = redis.createClient({
    socket: {
        host: keys.redisHost,
        port: keys.redisPort,
    },
    retry_strategy: () => 1000
});
const redisPublisher = redis.createClient({
    socket: {
        host: keys.redisHost,
        port: keys.redisPort,
    },
    retry_strategy: () => 1000
});

// Connect Redis clients
redisClient.connect().catch(console.error);
redisPublisher.connect().catch(console.error);

// Express route handlers
app.get('/', (req, res) => {
    res.send('Hi');
});

app.get('/values/all', async (req, res) => {
    const values = await pgClient.query('SELECT * FROM values');
    res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
    try {
        const values = await redisClient.hGetAll('values');
        res.send(values);
    } catch (err) {
        console.error('Redis error:', err);
        res.send({});
    }
});

app.post('/values', async (req, res) => {
    const index = req.body.index;
    if (parseInt(index) > 40) {
        return res.status(422).send('Index too high');
    }
    await redisClient.hSet('values', index, 'Nothing yet!');
    await redisPublisher.publish('insert', index);
    await pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);
    res.send({ working: true });
});

app.listen(5000, () => {
    console.log('Listening on port 5000');
});

/* pgClient.on("connect", (client) => {
    client
      .query("CREATE TABLE IF NOT EXISTS values (number INT)")
      .catch((err) => console.error(err));
  });


  const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort,
    ssl:
      process.env.NODE_ENV !== 'production'
        ? false
        : { rejectUnauthorized: false },
  }); */