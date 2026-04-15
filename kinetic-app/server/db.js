const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err)
})

// Thin wrappers to mirror better-sqlite3 call sites:
//   db.query(sql, params)  → { rows }
//   db.one(sql, params)    → row | null
//   db.run(sql, params)    → { rowCount, rows }

async function query(sql, params = []) {
  const client = await pool.connect()
  try {
    return await client.query(sql, params)
  } finally {
    client.release()
  }
}

async function one(sql, params = []) {
  const { rows } = await query(sql, params)
  return rows[0] ?? null
}

async function run(sql, params = []) {
  return query(sql, params)
}

// Transaction helper
// Usage: await db.transaction(async (client) => { await client.query(...) })
async function transaction(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

module.exports = { pool, query, one, run, transaction }
