// backend/socket/adapter.js
// Redis adapter for Socket.io — enables multi-instance horizontal scaling
// Drop-in replacement for default in-memory adapter
// Usage: pass io instance from server.js

const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

let pubClient, subClient;

async function attachRedisAdapter(io) {
  const url = process.env.REDIS_URL;

  if (!url) {
    console.warn('[socket] REDIS_URL not set — using in-memory adapter (single instance only)');
    return;
  }

  try {
    pubClient = createClient({ url });
    subClient = pubClient.duplicate();

    pubClient.on('error', (err) => console.error('[redis pub]', err.message));
    subClient.on('error', (err) => console.error('[redis sub]', err.message));

    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('[socket] Redis adapter attached —', url.replace(/:\/\/.*@/, '://***@'));
  } catch (err) {
    console.error('[socket] Redis adapter failed, falling back to memory:', err.message);
  }
}

async function closeRedisAdapter() {
  await pubClient?.quit();
  await subClient?.quit();
}

module.exports = { attachRedisAdapter, closeRedisAdapter };
