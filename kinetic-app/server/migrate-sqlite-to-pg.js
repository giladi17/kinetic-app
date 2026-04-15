/**
 * KINETIC — One-time SQLite → PostgreSQL migration
 * Usage: DATABASE_URL=postgres://... node migrate-sqlite-to-pg.js
 *
 * Prerequisites:
 *   1. PostgreSQL DB exists and schema.sql has been applied
 *   2. server/kinetic.db exists (SQLite source)
 *   3. DATABASE_URL is set in environment
 */

require('dotenv').config()
const Database = require('better-sqlite3')
const { Pool } = require('pg')
const path = require('path')

const sqlite = new Database(path.join(__dirname, 'kinetic.db'), { readonly: true })
const pg = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function migrate() {
  console.log('🚀 Starting SQLite → PostgreSQL migration...\n')
  const client = await pg.connect()

  try {
    await client.query('BEGIN')

    // ── users ────────────────────────────────────────────────────────────────
    const users = sqlite.prepare('SELECT * FROM users').all()
    for (const u of users) {
      await client.query(`
        INSERT INTO users (id, name, tier, premium_trial_ends_at, daily_calorie_target,
                           daily_protein_target, daily_water_target, onboarded)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO NOTHING
      `, [u.id, u.name, u.tier || 'premium', u.premium_trial_ends_at || null,
          u.daily_calorie_target, u.daily_protein_target, u.daily_water_target || 2.5, u.onboarded])
    }
    console.log(`✓ users: ${users.length} rows`)

    // ── user_stats ───────────────────────────────────────────────────────────
    const stats = sqlite.prepare('SELECT * FROM user_stats').all()
    for (const s of stats) {
      await client.query(`
        INSERT INTO user_stats (id, steps, step_goal, streak, streak_last_date, resting_hr,
                                sleep, hydration, active_minutes, current_weight, body_fat,
                                tier, trial_ends_at, name, daily_calorie_target,
                                daily_protein_target, onboarding_done)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        ON CONFLICT (id) DO NOTHING
      `, [s.id, s.steps, s.step_goal, s.streak, s.streak_last_date || null, s.resting_hr,
          s.sleep, s.hydration, s.active_minutes, s.current_weight, s.body_fat,
          s.tier || 'premium', s.trial_ends_at || null, s.name,
          s.daily_calorie_target, s.daily_protein_target, s.onboarding_done || 0])
    }
    console.log(`✓ user_stats: ${stats.length} rows`)

    // ── workouts ─────────────────────────────────────────────────────────────
    const workouts = sqlite.prepare('SELECT * FROM workouts').all()
    for (const w of workouts) {
      let exercises = '[]'
      try { exercises = w.exercises || '[]'; JSON.parse(exercises) } catch { exercises = '[]' }
      await client.query(`
        INSERT INTO workouts (id, name, category, level, duration, description,
                              muscle_groups, muscle_group, exercises)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (id) DO NOTHING
      `, [w.id, w.name, w.category, w.level, w.duration, w.description || '',
          w.muscle_groups || '', w.muscle_group || 'full_body', exercises])
    }
    // Keep SERIAL sequence in sync
    if (workouts.length > 0) {
      await client.query(`SELECT setval('workouts_id_seq', (SELECT MAX(id) FROM workouts))`)
    }
    console.log(`✓ workouts: ${workouts.length} rows`)

    // ── sessions ─────────────────────────────────────────────────────────────
    const sessions = sqlite.prepare('SELECT * FROM sessions').all()
    for (const s of sessions) {
      await client.query(`
        INSERT INTO sessions (id, workout_id, duration, calories, volume, date)
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (id) DO NOTHING
      `, [s.id, s.workout_id || null, s.duration || 0, s.calories || 0,
          s.volume || 0, s.date])
    }
    if (sessions.length > 0) {
      await client.query(`SELECT setval('sessions_id_seq', (SELECT MAX(id) FROM sessions))`)
    }
    console.log(`✓ sessions: ${sessions.length} rows`)

    // ── workout_sets ─────────────────────────────────────────────────────────
    const sets = sqlite.prepare('SELECT * FROM workout_sets').all()
    for (const s of sets) {
      await client.query(`
        INSERT INTO workout_sets (id, session_id, exercise_name, weight, reps, rpe,
                                  is_ai_alternative, set_number, completed, date)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (id) DO NOTHING
      `, [s.id, s.session_id, s.exercise_name, s.weight || 0, s.reps || 0, s.rpe || 7,
          s.is_ai_alternative === 1, s.set_number || 1, s.completed !== 0, s.date])
    }
    if (sets.length > 0) {
      await client.query(`SELECT setval('workout_sets_id_seq', (SELECT MAX(id) FROM workout_sets))`)
    }
    console.log(`✓ workout_sets: ${sets.length} rows`)

    // ── weight_logs ──────────────────────────────────────────────────────────
    const weights = sqlite.prepare('SELECT * FROM weight_logs').all()
    for (const w of weights) {
      await client.query(`
        INSERT INTO weight_logs (id, weight, date) VALUES ($1,$2,$3)
        ON CONFLICT (id) DO NOTHING
      `, [w.id, w.weight, w.date])
    }
    if (weights.length > 0) {
      await client.query(`SELECT setval('weight_logs_id_seq', (SELECT MAX(id) FROM weight_logs))`)
    }
    console.log(`✓ weight_logs: ${weights.length} rows`)

    // ── nutrition_logs ───────────────────────────────────────────────────────
    const meals = sqlite.prepare('SELECT * FROM nutrition_logs').all()
    for (const m of meals) {
      await client.query(`
        INSERT INTO nutrition_logs (id, date, meal_name, calories, protein, carbs, fat, entry_method)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO NOTHING
      `, [m.id, m.date, m.meal_name, m.calories || 0, m.protein || 0,
          m.carbs || 0, m.fat || 0, m.entry_method || 'manual'])
    }
    if (meals.length > 0) {
      await client.query(`SELECT setval('nutrition_logs_id_seq', (SELECT MAX(id) FROM nutrition_logs))`)
    }
    console.log(`✓ nutrition_logs: ${meals.length} rows`)

    // ── supplements ──────────────────────────────────────────────────────────
    const supps = sqlite.prepare('SELECT * FROM supplements').all()
    for (const s of supps) {
      await client.query(`
        INSERT INTO supplements (id, name, servings_remaining, servings_total,
                                 cost_per_serving, current_streak, last_taken)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (id) DO NOTHING
      `, [s.id, s.name, s.servings_remaining, s.servings_total,
          s.cost_per_serving || 0, s.current_streak || 0, s.last_taken || null])
    }
    if (supps.length > 0) {
      await client.query(`SELECT setval('supplements_id_seq', (SELECT MAX(id) FROM supplements))`)
    }
    console.log(`✓ supplements: ${supps.length} rows`)

    // ── daily_readiness ──────────────────────────────────────────────────────
    const readiness = sqlite.prepare('SELECT * FROM daily_readiness').all()
    for (const r of readiness) {
      await client.query(`
        INSERT INTO daily_readiness (id, date, sleep_hours, subjective_score,
                                     system_readiness_score, notes)
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (id) DO NOTHING
      `, [r.id, r.date, r.sleep_hours, r.subjective_score,
          r.system_readiness_score, r.notes || ''])
    }
    if (readiness.length > 0) {
      await client.query(`SELECT setval('daily_readiness_id_seq', (SELECT MAX(id) FROM daily_readiness))`)
    }
    console.log(`✓ daily_readiness: ${readiness.length} rows`)

    // ── reminders ────────────────────────────────────────────────────────────
    const reminders = sqlite.prepare('SELECT * FROM reminders').all()
    for (const r of reminders) {
      await client.query(`
        INSERT INTO reminders (id, type, hour, minute, enabled, last_sent)
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (id) DO NOTHING
      `, [r.id, r.type, r.hour, r.minute, r.enabled !== 0, r.last_sent || null])
    }
    if (reminders.length > 0) {
      await client.query(`SELECT setval('reminders_id_seq', (SELECT MAX(id) FROM reminders))`)
    }
    console.log(`✓ reminders: ${reminders.length} rows`)

    // ── personal_records ─────────────────────────────────────────────────────
    const prs = sqlite.prepare('SELECT * FROM personal_records').all()
    for (const p of prs) {
      await client.query(`
        INSERT INTO personal_records (id, exercise_name, weight, reps, date, session_id)
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (id) DO NOTHING
      `, [p.id, p.exercise_name, p.weight, p.reps, p.date, p.session_id || null])
    }
    if (prs.length > 0) {
      await client.query(`SELECT setval('personal_records_id_seq', (SELECT MAX(id) FROM personal_records))`)
    }
    console.log(`✓ personal_records: ${prs.length} rows`)

    await client.query('COMMIT')
    console.log('\n✅ Migration complete!')

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('\n❌ Migration failed — rolled back:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pg.end()
    sqlite.close()
  }
}

migrate()
