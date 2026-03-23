#!/usr/bin/env node
// backend/scripts/migrate.js
// Runs all migrations in order — idempotent, safe to re-run

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');

async function run() {
  // Ensure migration tracking table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id        SERIAL PRIMARY KEY,
      filename  TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const applied = await pool.query('SELECT filename FROM _migrations');
  const appliedSet = new Set(applied.rows.map(r => r.filename));

  // Get all .sql files in order
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`  skip  ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`  ✓     ${file}`);
      count++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  ✗     ${file}: ${err.message}`);
      process.exit(1);
    } finally {
      client.release();
    }
  }

  console.log(`\n${count} migration(s) applied.`);
  await pool.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
