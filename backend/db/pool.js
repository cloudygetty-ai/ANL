// backend/db/pool.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('[pool] Unexpected client error:', err.message);
});

pool.on('connect', () => {
  // Uncomment for verbose debug:
  // console.log('[pool] New client connected. Total:', pool.totalCount);
});

// Health probe — used by /health endpoint
pool.healthCheck = async () => {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    return { ok: true, total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount };
  } finally {
    client.release();
  }
};

module.exports = pool;
