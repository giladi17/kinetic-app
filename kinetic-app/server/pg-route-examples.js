/**
 * KINETIC — pg route conversion examples
 * Shows the before/after pattern for migrating index.js routes.
 * This file is reference only — not loaded by the server.
 */

const db = require('./db')

// ─── EXAMPLE 1: GET (simple query) ──────────────────────────────────────────
//
// BEFORE (better-sqlite3):
//   app.get('/api/workouts', (req, res) => {
//     const { category } = req.query
//     const rows = category
//       ? db.prepare('SELECT * FROM workouts WHERE category = ?').all(category)
//       : db.prepare('SELECT * FROM workouts').all()
//     res.json(rows)
//   })
//
// AFTER (pg):

app.get('/api/workouts', asyncHandler(async (req, res) => {
  const { category } = req.query
  const { rows } = category
    ? await db.query('SELECT * FROM workouts WHERE category = $1', [category])
    : await db.query('SELECT * FROM workouts')
  res.json(rows)
}))


// ─── EXAMPLE 2: POST (insert + return id) ────────────────────────────────────
//
// BEFORE (better-sqlite3):
//   app.post('/api/sessions/start', (req, res) => {
//     const { workoutId } = req.body
//     const today = new Date().toISOString().split('T')[0]
//     const result = db.prepare(
//       'INSERT INTO sessions (workout_id, duration, calories, volume, date) VALUES (?, 0, 0, 0, ?)'
//     ).run(workoutId || null, today)
//     res.json({ session_id: result.lastInsertRowid })
//   })
//
// AFTER (pg):
//   Key difference: use RETURNING id instead of lastInsertRowid

app.post('/api/sessions/start', asyncHandler(async (req, res) => {
  const { workoutId } = req.body
  const today = new Date().toISOString().split('T')[0]
  const { rows } = await db.query(
    'INSERT INTO sessions (workout_id, duration, calories, volume, date) VALUES ($1, 0, 0, 0, $2) RETURNING id',
    [workoutId || null, today]
  )
  res.json({ session_id: rows[0].id })
}))


// ─── EXAMPLE 3: PATCH with transaction (streak update) ──────────────────────
//
// BEFORE (better-sqlite3):
//   app.patch('/api/sessions/:id', (req, res) => {
//     const { duration, calories, volume } = req.body
//     db.prepare('UPDATE sessions SET duration=?, calories=?, volume=? WHERE id=?')
//       .run(duration || 0, calories || 0, volume || 0, req.params.id)
//     const today = new Date().toISOString().split('T')[0]
//     const statsRow = db.prepare('SELECT streak_last_date FROM user_stats WHERE id=1').get()
//     if (statsRow.streak_last_date !== today) {
//       db.prepare('UPDATE user_stats SET streak=streak+1, streak_last_date=? WHERE id=1').run(today)
//     }
//     res.json({ ok: true })
//   })
//
// AFTER (pg):
//   Both UPDATEs wrapped in a transaction so they succeed or fail together.
//   Note: SQLite DATE strings compare as TEXT; PostgreSQL DATE comparisons are native.

app.patch('/api/sessions/:id', asyncHandler(async (req, res) => {
  const { duration, calories, volume } = req.body
  const today = new Date().toISOString().split('T')[0]

  await db.transaction(async (client) => {
    await client.query(
      'UPDATE sessions SET duration=$1, calories=$2, volume=$3 WHERE id=$4',
      [duration || 0, calories || 0, volume || 0, req.params.id]
    )
    const { rows } = await client.query(
      'SELECT streak_last_date FROM user_stats WHERE id=1'
    )
    const lastDate = rows[0]?.streak_last_date
      ? new Date(rows[0].streak_last_date).toISOString().split('T')[0]
      : null
    if (lastDate !== today) {
      await client.query(
        'UPDATE user_stats SET streak=streak+1, streak_last_date=$1 WHERE id=1',
        [today]
      )
    }
  })

  res.json({ ok: true })
}))


// ─── QUICK REFERENCE ─────────────────────────────────────────────────────────
//
// SQLite → PostgreSQL cheatsheet for this codebase:
//
// Placeholders        ?              →  $1, $2, $3 ...
// Last insert id      .lastInsertRowid  →  RETURNING id  → rows[0].id
// Single row          .get()         →  await db.one(sql, params)
// All rows            .all()         →  (await db.query(sql, params)).rows
// Run (no return)     .run()         →  await db.run(sql, params)
// Sync execution      (sync)         →  async/await everywhere
// ON CONFLICT (SQLite UPSERT)        →  same syntax (PostgreSQL supports it)
// date('now','-7 days')              →  CURRENT_DATE - INTERVAL '7 days'
// AUTOINCREMENT                      →  SERIAL  (or GENERATED ALWAYS AS IDENTITY)
// INTEGER PRIMARY KEY CHECK (id=1)   →  INTEGER PRIMARY KEY DEFAULT 1 CHECK (id=1)
