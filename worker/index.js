const keys = require('./keys');
const redis = require('redis');

const redisClient = redis.createClient({
    socket: {
        host: keys.redisHost,
        port: keys.redisPort,
    },
    retry_strategy: () => 1000
});

// sub se usa solo para escuchar (subscribe, on('message')). Es como un listener.
const sub = redis.createClient({
    socket: {
        host: keys.redisHost,
        port: keys.redisPort,
    },
    retry_strategy: () => 1000
});

// Connect Redis clients
redisClient.connect().catch(console.error);
sub.connect().catch(console.error);

function fib(index) {
    if (index < 2) return 1;
    return fib(index - 1) + fib(index - 2);
}

// Set up message handler
sub.on('message', async (channel, message) => {
    // redisClient se usa para escribir resultados (hset)
    await redisClient.hSet('values', message, fib(parseInt(message))).catch(console.error);
});

// Subscribe to channel
sub.subscribe('insert').catch(console.error);

// Idea clave:
// Se separan conexiones para que una se dedique a escuchar eventos y la otra a hacer operaciones normales.