// v2
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const Database = require('better-sqlite3')
const path = require('path')
const https = require('https')
const rateLimit = require('express-rate-limit')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { requireAuth, JWT_SECRET } = require('./middleware/auth')
const { OAuth2Client } = require('google-auth-library')
const webpush = require('web-push')
const cron = require('node-cron')
const { sendWelcomeEmail, sendReminderEmail, sendProOfferEmail } = require('./emails')
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:kinetic@kinetic.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

const corsOptions = {
  origin: [
    'https://kinetic-app-git-master-gilads-projects-053a65e1.vercel.app',
    'https://kinetic-app-lovat.vercel.app',
    'https://kinetic-app-production.up.railway.app',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept']
}

const app = express()
app.set('trust proxy', 1)
app.use(cors(corsOptions))

// ⚠️ Stripe webhook MUST be before express.json() — needs raw body
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ error: 'Stripe webhook not configured' })
  }
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
  const sig = req.headers['stripe-signature']
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }
  if (event.type === 'checkout.session.completed') {
    const uid = Number(event.data.object.metadata?.userId)
    if (uid) {
      db.prepare('UPDATE users SET is_pro = 1 WHERE id = ?').run(uid)
      db.prepare("UPDATE user_stats SET tier = 'premium' WHERE id = ?").run(uid)
    }
  }
  res.json({ received: true })
})

app.use(express.json())

// Health check — required for Railway deployment verification
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// Rate limiting for AI endpoint
app.use('/api/ai/chat', rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'rate_limit', message: 'נסה שוב בעוד דקה' },
}))

// asyncHandler — wraps async route handlers to forward errors (Express 4 compat)
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

const db = new Database(path.join(__dirname, 'kinetic.db'))
db.pragma('journal_mode = WAL')

// ============================================
// MIDDLEWARE FUNCTIONS - must be defined before routes
// ============================================

// asyncHandler is defined above (line ~63) — listed here for reference only.

// Returns true if user has a paid Pro subscription OR an active trial period
function isUserPro(dbUserId) {
  const user = db.prepare('SELECT is_pro FROM users WHERE id = ?').get(dbUserId)
  if (user?.is_pro) return true
  const stats = db.prepare('SELECT tier, trial_ends_at FROM user_stats WHERE id = ?').get(dbUserId)
  return (
    stats?.tier === 'premium' &&
    !!stats?.trial_ends_at &&
    new Date(stats.trial_ends_at) > new Date()
  )
}

// Blocks non-Pro users with 403 premium_required
function requirePro(req, res, next) {
  if (isUserPro(req.dbUserId)) return next()
  res.status(403).json({ error: 'premium_required', message: "פיצ'ר זה דורש מנוי Pro" })
}

// Backward-compat alias — kept so existing routes don't need renaming
function checkPremium(req, res, next) {
  return requirePro(req, res, next)
}

// ─── SCHEMA ────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT DEFAULT 'Alex',
    tier TEXT DEFAULT 'free',
    is_pro INTEGER DEFAULT 0,
    premium_trial_ends_at TEXT DEFAULT '',
    daily_calorie_target INTEGER DEFAULT 2500,
    daily_protein_target INTEGER DEFAULT 160,
    daily_water_target REAL DEFAULT 2.5,
    onboarded INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    level TEXT NOT NULL,
    duration INTEGER NOT NULL,
    description TEXT DEFAULT '',
    muscle_groups TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER,
    duration INTEGER,
    calories INTEGER,
    volume INTEGER,
    date TEXT,
    FOREIGN KEY(workout_id) REFERENCES workouts(id)
  );

  CREATE TABLE IF NOT EXISTS workout_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    exercise_name TEXT NOT NULL,
    weight REAL DEFAULT 0,
    reps INTEGER DEFAULT 0,
    rpe INTEGER DEFAULT 7,
    is_ai_alternative INTEGER DEFAULT 0,
    date TEXT,
    FOREIGN KEY(session_id) REFERENCES sessions(id)
  );

  CREATE TABLE IF NOT EXISTS user_stats (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    steps INTEGER DEFAULT 8432,
    step_goal INTEGER DEFAULT 10000,
    streak INTEGER DEFAULT 0,
    streak_last_date TEXT DEFAULT '',
    resting_hr INTEGER DEFAULT 62,
    sleep TEXT DEFAULT '7h 20m',
    hydration REAL DEFAULT 1.8,
    active_minutes INTEGER DEFAULT 54,
    current_weight REAL DEFAULT 78.5,
    body_fat REAL DEFAULT 14.2
  );

  CREATE TABLE IF NOT EXISTS weight_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weight REAL NOT NULL,
    date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS nutrition_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    meal_name TEXT NOT NULL,
    calories INTEGER DEFAULT 0,
    protein REAL DEFAULT 0,
    carbs REAL DEFAULT 0,
    fat REAL DEFAULT 0,
    entry_method TEXT DEFAULT 'manual'
  );

  CREATE TABLE IF NOT EXISTS supplements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    servings_remaining REAL NOT NULL DEFAULT 0,
    servings_total REAL NOT NULL DEFAULT 0,
    cost_per_serving REAL DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    last_taken TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS daily_readiness (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    sleep_hours REAL DEFAULT 7,
    subjective_score INTEGER DEFAULT 7,
    system_readiness_score INTEGER DEFAULT 70,
    notes TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS readiness_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    date TEXT,
    sleep_hours REAL DEFAULT 7,
    stress_level INTEGER DEFAULT 5,
    notes TEXT,
    UNIQUE(user_id, date)
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user','model')),
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    subscription TEXT NOT NULL,
    endpoint TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, endpoint)
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    hour INTEGER NOT NULL DEFAULT 8,
    minute INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    last_sent TEXT
  );

  CREATE TABLE IF NOT EXISTS workout_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    is_custom INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS plan_days (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER,
    day_number INTEGER,
    name TEXT,
    muscle_groups TEXT,
    FOREIGN KEY(plan_id) REFERENCES workout_plans(id)
  );

  CREATE TABLE IF NOT EXISTS plan_day_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_day_id INTEGER,
    exercise_name TEXT NOT NULL,
    sets INTEGER DEFAULT 3,
    reps TEXT DEFAULT '8-12',
    FOREIGN KEY(plan_day_id) REFERENCES plan_days(id)
  );

  CREATE TABLE IF NOT EXISTS personal_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_name TEXT NOT NULL UNIQUE,
    weight REAL NOT NULL,
    reps INTEGER NOT NULL,
    date TEXT NOT NULL,
    session_id INTEGER,
    FOREIGN KEY(session_id) REFERENCES sessions(id)
  );

  CREATE TABLE IF NOT EXISTS users_auth (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    goal TEXT DEFAULT '',
    fitness_level TEXT DEFAULT '',
    days_per_week INTEGER DEFAULT 3,
    age INTEGER DEFAULT 25,
    created_at TEXT DEFAULT (datetime('now'))
  );
`)

// ─── SEED ──────────────────────────────────────────────────────────────────

const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get()
if (userCount.c === 0) {
  db.prepare('INSERT INTO users (id) VALUES (1)').run()
}

const statsCount = db.prepare('SELECT COUNT(*) as c FROM user_stats').get()
if (statsCount.c === 0) {
  db.prepare('INSERT INTO user_stats (id) VALUES (1)').run()
}

const wCount = db.prepare('SELECT COUNT(*) as c FROM workouts').get()
if (wCount.c === 0) {
  const insert = db.prepare('INSERT INTO workouts (name, category, level, duration, description, muscle_groups) VALUES (?, ?, ?, ?, ?, ?)')
  const workouts = [
    ['HYPER-DENSITY STRENGTH', 'STRENGTH', 'ADVANCED', 45, 'A high-volume hypertrophy protocol designed for maximum muscle recruitment and neural drive.', 'chest,back,shoulders'],
    ['Vascular Engine', 'CARDIO', 'INTERMEDIATE', 25, 'High-intensity cardio circuit for maximum cardiovascular conditioning.', 'full_body'],
    ['Mobility Flow 2.0', 'YOGA', 'BEGINNER', 50, 'Full body mobility and flexibility routine for recovery and movement.', 'full_body'],
    ['Explosive Power', 'HIIT', 'ELITE', 30, 'Plyometric power training for athletic performance.', 'legs,glutes'],
    ['Combat Conditioning', 'HIIT', 'INTERMEDIATE', 40, 'Boxing-inspired conditioning for endurance and coordination.', 'arms,core'],
    ['Upper Body Blast', 'STRENGTH', 'INTERMEDIATE', 35, 'Focused upper body strength training for muscle and definition.', 'chest,shoulders,arms'],
    ['Leg Day Protocol', 'STRENGTH', 'ADVANCED', 55, 'Complete lower body strength session targeting quads, hamstrings and glutes.', 'legs,glutes'],
    ['Core & Mobility', 'YOGA', 'BEGINNER', 30, 'Core strengthening combined with mobility work for injury prevention.', 'core'],
  ]
  workouts.forEach(w => insert.run(...w))
}

// Seed built-in workout plans
const planCount = db.prepare('SELECT COUNT(*) as c FROM workout_plans').get()
if (planCount.c === 0) {
  const insertPlan = db.prepare('INSERT INTO workout_plans (name, description, is_custom) VALUES (?, ?, 0)')
  const insertDay  = db.prepare('INSERT INTO plan_days (plan_id, day_number, name, muscle_groups) VALUES (?, ?, ?, ?)')
  const insertEx   = db.prepare('INSERT INTO plan_day_exercises (plan_day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)')

  const PLANS = [
    {
      name: 'Push / Pull / Legs',
      description: '3 ימים בשבוע — חלוקה קלאסית לפי קבוצות שריר',
      days: [
        { name: 'PUSH — חזה + כתפיים + טריצפס', muscles: 'chest,shoulders,triceps', exercises: [
          ['Bench Press','4','6-8'], ['Incline DB Press','3','8-12'], ['Shoulder Press','3','8-12'],
          ['Lateral Raises','3','12-15'], ['Tricep Pushdown','3','10-12'], ['Skull Crushers','3','10-12'],
        ]},
        { name: 'PULL — גב + ביצפס', muscles: 'back,biceps', exercises: [
          ['Deadlift','4','5-6'], ['Pull-ups','3','6-10'], ['Barbell Row','3','8-10'],
          ['Cable Row','3','10-12'], ['Bicep Curl','3','10-12'], ['Hammer Curl','3','10-12'],
        ]},
        { name: 'LEGS — רגליים + בטן', muscles: 'legs,glutes,core', exercises: [
          ['Squat','4','6-8'], ['Leg Press','3','10-12'], ['Romanian Deadlift','3','8-10'],
          ['Leg Curl','3','10-12'], ['Calf Raises','4','15-20'], ['Plank','3','60s'],
        ]},
      ],
    },
    {
      name: 'Upper / Lower',
      description: '4 ימים בשבוע — חלק עליון ותחתון לסירוגין',
      days: [
        { name: 'UPPER A — חזה + גב', muscles: 'chest,back', exercises: [
          ['Bench Press','4','6-8'], ['Pull-ups','4','6-10'], ['DB Row','3','10-12'], ['Dips','3','8-12'],
        ]},
        { name: 'LOWER A — רגליים', muscles: 'legs,glutes', exercises: [
          ['Squat','4','6-8'], ['Leg Press','3','10-12'], ['Leg Curl','3','10-12'], ['Calf Raises','4','15-20'],
        ]},
        { name: 'UPPER B — כתפיים + זרועות', muscles: 'shoulders,arms', exercises: [
          ['Shoulder Press','4','8-10'], ['Lateral Raises','3','12-15'], ['Bicep Curl','3','10-12'], ['Tricep Pushdown','3','10-12'],
        ]},
        { name: 'LOWER B — רגליים ב׳', muscles: 'legs,glutes,core', exercises: [
          ['Romanian Deadlift','4','8-10'], ['Lunges','3','10-12'], ['Leg Extension','3','12-15'], ['Plank','3','60s'],
        ]},
      ],
    },
    {
      name: 'תוכנית מותאמת אישית',
      description: '3 ימים — חלוקה לפי קבוצות אנטגוניסטיות',
      days: [
        { name: 'חזה + טריצפס', muscles: 'chest,triceps', exercises: [
          ['Bench Press','4','6-8'], ['Incline Press','3','8-12'], ['Dips','3','8-12'], ['Tricep Pushdown','3','10-12'],
        ]},
        { name: 'כתפיים + רגליים', muscles: 'shoulders,legs', exercises: [
          ['Shoulder Press','4','8-10'], ['Lateral Raises','3','12-15'], ['Squat','4','6-8'], ['Leg Press','3','10-12'],
        ]},
        { name: 'גב + ביצפס', muscles: 'back,biceps', exercises: [
          ['Deadlift','4','5-6'], ['Pull-ups','3','6-10'], ['Barbell Row','3','8-10'], ['Bicep Curl','3','10-12'],
        ]},
      ],
    },
  ]

  for (const plan of PLANS) {
    const { lastInsertRowid: planId } = insertPlan.run(plan.name, plan.description)
    plan.days.forEach((day, idx) => {
      const { lastInsertRowid: dayId } = insertDay.run(planId, idx + 1, day.name, day.muscles)
      day.exercises.forEach(([name, sets, reps]) => insertEx.run(dayId, name, parseInt(sets), reps))
    })
  }
}

const wlCount = db.prepare('SELECT COUNT(*) as c FROM weight_logs').get()
if (wlCount.c === 0) {
  const wInsert = db.prepare('INSERT INTO weight_logs (weight, date) VALUES (?, ?)')
  const base = new Date()
  ;[82.7, 81.9, 81.2, 80.5, 79.8, 79.1, 78.5].forEach((w, i) => {
    const d = new Date(base)
    d.setMonth(d.getMonth() - (6 - i))
    wInsert.run(w, d.toISOString().split('T')[0])
  })
}

// Migrate supplements table if it has old schema (daily_dose column)
const suppCols = db.prepare("PRAGMA table_info(supplements)").all().map(c => c.name)
if (suppCols.includes('daily_dose') || !suppCols.includes('servings_total')) {
  db.exec('DROP TABLE IF EXISTS supplements')
  db.exec(`CREATE TABLE supplements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    servings_remaining REAL NOT NULL DEFAULT 0,
    servings_total REAL NOT NULL DEFAULT 0,
    cost_per_serving REAL DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    last_taken TEXT DEFAULT ''
  )`)
}

const suppCount = db.prepare('SELECT COUNT(*) as c FROM supplements').get()
if (suppCount.c === 0) {
  const insert = db.prepare('INSERT INTO supplements (name, servings_remaining, servings_total, cost_per_serving, current_streak) VALUES (?, ?, ?, ?, ?)')
  insert.run('Creatine', 90, 90, 0.20, 0)
  insert.run('Whey Protein', 60, 60, 1.20, 0)
  insert.run('Omega-3', 120, 120, 0.30, 0)
}

// ─── MIGRATE: add clerk_id + is_pro to users ───────────────────────────────
const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name)
if (!userCols.includes('clerk_id')) {
  db.exec("ALTER TABLE users ADD COLUMN clerk_id TEXT")
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id) WHERE clerk_id IS NOT NULL")
}
if (!userCols.includes('is_pro')) {
  db.exec("ALTER TABLE users ADD COLUMN is_pro INTEGER DEFAULT 0")
}

// ─── MIGRATE: add muscle_group column if missing ────────────────────────────
const workoutCols = db.prepare("PRAGMA table_info(workouts)").all().map(c => c.name)
if (!workoutCols.includes('muscle_group')) {
  db.exec("ALTER TABLE workouts ADD COLUMN muscle_group TEXT DEFAULT 'full_body'")
  db.exec("UPDATE workouts SET muscle_group = 'strength' WHERE category = 'STRENGTH'")
  db.exec("UPDATE workouts SET muscle_group = 'cardio'   WHERE category = 'CARDIO'")
  db.exec("UPDATE workouts SET muscle_group = 'mobility' WHERE category = 'YOGA'")
  db.exec("UPDATE workouts SET muscle_group = 'full_body' WHERE category = 'HIIT'")
  db.exec("UPDATE workouts SET muscle_group = 'chest'    WHERE name LIKE '%Upper Body%'")
  db.exec("UPDATE workouts SET muscle_group = 'legs'     WHERE name LIKE '%Explosive%' OR name LIKE '%Leg%'")
}

// ─── MIGRATE: add exercises column to workouts ─────────────────────────────
const workoutCols2 = db.prepare("PRAGMA table_info(workouts)").all().map(c => c.name)
if (!workoutCols2.includes('exercises')) {
  db.exec("ALTER TABLE workouts ADD COLUMN exercises TEXT DEFAULT '[]'")
  const exMap = {
    1: JSON.stringify(['Bench Press', 'Barbell Row', 'Overhead Press', 'Back Squat', 'Romanian Deadlift']),
    2: JSON.stringify(['Running Intervals', 'Jump Rope', 'Bike Sprints', 'Rowing', 'Stair Climb']),
    3: JSON.stringify(['Cat-Cow', 'Downward Dog', 'Hip Flexor Stretch', 'Spinal Twist', 'Pigeon Pose']),
    4: JSON.stringify(['Box Jumps', 'Broad Jumps', 'Plyometric Lunges', 'Jump Squats', 'Explosive Push-Ups']),
    5: JSON.stringify(['Jab-Cross Combos', 'Slip Drill', 'Knee Strikes', 'Footwork Drill', 'Heavy Bag Work']),
    6: JSON.stringify(['Bench Press', 'Cable Fly', 'Shoulder Press', 'Lateral Raise', 'Tricep Dips']),
    7: JSON.stringify(['Back Squat', 'Romanian Deadlift', 'Leg Press', 'Bulgarian Split Squat', 'Calf Raises']),
    8: JSON.stringify(['Dead Bug', 'Pallof Press', 'Hip Flexor Stretch', 'Bird Dog', 'Hollow Body Hold']),
  }
  const upEx = db.prepare("UPDATE workouts SET exercises = ? WHERE id = ?")
  Object.entries(exMap).forEach(([wid, exJson]) => upEx.run(exJson, parseInt(wid)))
}

// ─── MIGRATE: add set_number and completed to workout_sets ──────────────────
const setCols = db.prepare("PRAGMA table_info(workout_sets)").all().map(c => c.name)
if (!setCols.includes('set_number')) {
  db.exec("ALTER TABLE workout_sets ADD COLUMN set_number INTEGER DEFAULT 1")
}
if (!setCols.includes('completed')) {
  db.exec("ALTER TABLE workout_sets ADD COLUMN completed INTEGER DEFAULT 1")
}

// ─── MIGRATE: add tier / trial / onboarding to user_stats ──────────────────
const usCols = db.prepare("PRAGMA table_info(user_stats)").all().map(c => c.name)
const usAlters = [
  ['tier',                  "ALTER TABLE user_stats ADD COLUMN tier TEXT DEFAULT 'free'"],
  ['trial_ends_at',         "ALTER TABLE user_stats ADD COLUMN trial_ends_at TEXT DEFAULT ''"],
  ['name',                  "ALTER TABLE user_stats ADD COLUMN name TEXT DEFAULT 'Alex'"],
  ['daily_calorie_target',  "ALTER TABLE user_stats ADD COLUMN daily_calorie_target INTEGER DEFAULT 2500"],
  ['daily_protein_target',  "ALTER TABLE user_stats ADD COLUMN daily_protein_target INTEGER DEFAULT 160"],
  ['onboarding_done',       "ALTER TABLE user_stats ADD COLUMN onboarding_done INTEGER DEFAULT 0"],
  ['gender',                "ALTER TABLE user_stats ADD COLUMN gender TEXT DEFAULT 'male'"],
  ['ai_persona',            "ALTER TABLE user_stats ADD COLUMN ai_persona TEXT DEFAULT 'auto'"],
  ['water_today',           "ALTER TABLE user_stats ADD COLUMN water_today REAL DEFAULT 0"],
  ['water_date',            "ALTER TABLE user_stats ADD COLUMN water_date TEXT DEFAULT ''"],
  ['age',                   "ALTER TABLE user_stats ADD COLUMN age INTEGER DEFAULT 25"],
  ['tour_done',             "ALTER TABLE user_stats ADD COLUMN tour_done INTEGER DEFAULT 0"],
  ['challenge_done_date',   "ALTER TABLE user_stats ADD COLUMN challenge_done_date TEXT DEFAULT ''"],
]
usAlters.forEach(([col, sql]) => { if (!usCols.includes(col)) db.exec(sql) })

// Seed trial date + sync name/targets/onboarding from users table
const usRow = db.prepare('SELECT * FROM user_stats WHERE id = 1').get()
if (!usRow.trial_ends_at) {
  const t = new Date(); t.setDate(t.getDate() + 14)
  db.prepare("UPDATE user_stats SET trial_ends_at = ? WHERE id = 1").run(t.toISOString())
}
const usersRow = db.prepare('SELECT * FROM users WHERE id = 1').get()
db.prepare(`
  UPDATE user_stats SET
    name                 = COALESCE(NULLIF(name, 'Alex'), ?),
    daily_calorie_target = COALESCE(NULLIF(daily_calorie_target, 2500), ?),
    daily_protein_target = COALESCE(NULLIF(daily_protein_target, 160), ?),
    onboarding_done      = ?
  WHERE id = 1
`).run(usersRow.name, usersRow.daily_calorie_target, usersRow.daily_protein_target, usersRow.onboarded)

// Fix: if streak > 0 but no sessions exist, reset streak to 0
const actualSessionCount = db.prepare('SELECT COUNT(*) as c FROM sessions').get()
const streakRow = db.prepare('SELECT streak, streak_last_date FROM user_stats WHERE id = 1').get()
if (actualSessionCount.c === 0 && (streakRow?.streak || 0) > 0 && !streakRow?.streak_last_date) {
  db.prepare('UPDATE user_stats SET streak = 0 WHERE id = 1').run()
}

// ─── MIGRATE: add body_fat + notes to weight_logs ──────────────────────────
const wlCols = db.prepare("PRAGMA table_info(weight_logs)").all().map(c => c.name)
if (!wlCols.includes('body_fat')) db.exec("ALTER TABLE weight_logs ADD COLUMN body_fat REAL")
if (!wlCols.includes('notes'))    db.exec("ALTER TABLE weight_logs ADD COLUMN notes TEXT DEFAULT ''")

// ─── MIGRATE: add user_id to sessions, workout_sets, nutrition_logs, weight_logs ─
;(function migrateUserIdColumns() {
  const tables = [
    ['sessions',       'sessions'],
    ['workout_sets',   'workout_sets'],
    ['nutrition_logs', 'nutrition_logs'],
    ['weight_logs',    'weight_logs'],
  ]
  for (const [table] of tables) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name)
    if (!cols.includes('user_id')) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN user_id INTEGER REFERENCES users(id)`)
      db.exec(`UPDATE ${table} SET user_id = 1 WHERE user_id IS NULL`)
      console.log(`[Migration] Added user_id to ${table}`)
    }
  }
})()

// ─── MIGRATE: add email-tracking columns to users_auth ─────────────────────
const authCols = db.prepare("PRAGMA table_info(users_auth)").all().map(c => c.name)
const authAlters = [
  ['last_login_at',      "ALTER TABLE users_auth ADD COLUMN last_login_at TEXT"],
  ['email_welcome_sent', "ALTER TABLE users_auth ADD COLUMN email_welcome_sent INTEGER DEFAULT 0"],
  ['email_day3_sent',    "ALTER TABLE users_auth ADD COLUMN email_day3_sent INTEGER DEFAULT 0"],
  ['email_day7_sent',    "ALTER TABLE users_auth ADD COLUMN email_day7_sent INTEGER DEFAULT 0"],
  ['user_id',            "ALTER TABLE users_auth ADD COLUMN user_id INTEGER REFERENCES users(id)"],
]
authAlters.forEach(([col, sql]) => { if (!authCols.includes(col)) db.exec(sql) })
// Point all existing auth rows to user id=1 (the legacy single-user row)
db.prepare("UPDATE users_auth SET user_id = 1 WHERE user_id IS NULL").run()

// ─── MIGRATE: remove CHECK(id=1) — enable multi-user support ───────────────
;(function migrateMultiUser() {
  const usersSQL = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get()?.sql || ''
  if (!usersSQL.includes('CHECK (id = 1)')) return  // already migrated

  console.log('[Migration] Upgrading schema to multi-user...')
  db.exec('PRAGMA foreign_keys = OFF')
  const migrate = db.transaction(() => {
    db.exec(`DROP TABLE IF EXISTS users_v2`)
    db.exec(`
      CREATE TABLE users_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT DEFAULT 'Alex',
        tier TEXT DEFAULT 'free',
        is_pro INTEGER DEFAULT 0,
        premium_trial_ends_at TEXT DEFAULT '',
        daily_calorie_target INTEGER DEFAULT 2500,
        daily_protein_target INTEGER DEFAULT 160,
        daily_water_target REAL DEFAULT 2.5,
        onboarded INTEGER DEFAULT 0,
        clerk_id TEXT
      )
    `)
    db.exec(`INSERT INTO users_v2 (id,name,tier,is_pro,premium_trial_ends_at,daily_calorie_target,daily_protein_target,daily_water_target,onboarded,clerk_id)
      SELECT id,name,tier,is_pro,premium_trial_ends_at,daily_calorie_target,daily_protein_target,daily_water_target,onboarded,clerk_id FROM users`)
    db.exec(`DROP TABLE users`)
    db.exec(`ALTER TABLE users_v2 RENAME TO users`)

    db.exec(`DROP TABLE IF EXISTS user_stats_v2`)
    db.exec(`
      CREATE TABLE user_stats_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        steps INTEGER DEFAULT 8432,
        step_goal INTEGER DEFAULT 10000,
        streak INTEGER DEFAULT 0,
        streak_last_date TEXT DEFAULT '',
        resting_hr INTEGER DEFAULT 62,
        sleep TEXT DEFAULT '7h 20m',
        hydration REAL DEFAULT 1.8,
        active_minutes INTEGER DEFAULT 54,
        current_weight REAL DEFAULT 78.5,
        body_fat REAL DEFAULT 14.2,
        tier TEXT DEFAULT 'free',
        trial_ends_at TEXT DEFAULT '',
        name TEXT DEFAULT 'Alex',
        daily_calorie_target INTEGER DEFAULT 2500,
        daily_protein_target INTEGER DEFAULT 160,
        onboarding_done INTEGER DEFAULT 0,
        gender TEXT DEFAULT 'male',
        ai_persona TEXT DEFAULT 'auto',
        water_today REAL DEFAULT 0,
        water_date TEXT DEFAULT '',
        age INTEGER DEFAULT 25,
        tour_done INTEGER DEFAULT 0,
        challenge_done_date TEXT DEFAULT ''
      )
    `)
    db.exec(`INSERT INTO user_stats_v2 (id,steps,step_goal,streak,streak_last_date,resting_hr,sleep,hydration,active_minutes,current_weight,body_fat,tier,trial_ends_at,name,daily_calorie_target,daily_protein_target,onboarding_done,gender,ai_persona,water_today,water_date,age,tour_done,challenge_done_date)
      SELECT id,steps,step_goal,streak,streak_last_date,resting_hr,sleep,hydration,active_minutes,current_weight,body_fat,tier,trial_ends_at,name,daily_calorie_target,daily_protein_target,onboarding_done,gender,ai_persona,water_today,water_date,age,tour_done,challenge_done_date FROM user_stats`)
    db.exec(`DROP TABLE user_stats`)
    db.exec(`ALTER TABLE user_stats_v2 RENAME TO user_stats`)

    db.exec(`DROP TABLE IF EXISTS user_profile_v2`)
    db.exec(`
      CREATE TABLE user_profile_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        goal TEXT DEFAULT '',
        fitness_level TEXT DEFAULT '',
        days_per_week INTEGER DEFAULT 3,
        age INTEGER DEFAULT 25,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `)
    db.exec(`INSERT INTO user_profile_v2 (id,goal,fitness_level,days_per_week,age,created_at)
      SELECT id,goal,fitness_level,days_per_week,age,created_at FROM user_profile`)
    db.exec(`DROP TABLE user_profile`)
    db.exec(`ALTER TABLE user_profile_v2 RENAME TO user_profile`)
  })
  migrate()
  db.exec('PRAGMA foreign_keys = ON')
  console.log('[Migration] Multi-user schema migration complete.')
})()

// Seed reminders
const remCount = db.prepare('SELECT COUNT(*) as c FROM reminders').get()
if (remCount.c === 0) {
  db.prepare('INSERT INTO reminders (type, hour, minute) VALUES (?, ?, ?)').run('workout', 8, 0)
  db.prepare('INSERT INTO reminders (type, hour, minute) VALUES (?, ?, ?)').run('supplements', 8, 30)
  db.prepare('INSERT INTO reminders (type, hour, minute) VALUES (?, ?, ?)').run('streak_protection', 20, 0)
  db.prepare('INSERT INTO reminders (type, hour, minute) VALUES (?, ?, ?)').run('hydration', 13, 0)
}

// ─── QUICK LOG MEAL PRESETS ─────────────────────────────────────────────────
const MEAL_PRESETS = {
  breakfast_cornflakes: { meal_name: 'קורנפלקס עם חלב', calories: 350, protein: 12, carbs: 65, fat: 5 },
  breakfast_eggs:       { meal_name: 'חביתה 3 ביצים', calories: 280, protein: 21, carbs: 2, fat: 20 },
  lunch_chicken_rice:   { meal_name: 'חזה עוף עם אורז', calories: 550, protein: 45, carbs: 60, fat: 8 },
  lunch_chicken_pasta:  { meal_name: 'חזה עוף עם פסטה', calories: 580, protein: 42, carbs: 70, fat: 9 },
  dinner_tuna_toast:    { meal_name: 'טונה עם טוסט', calories: 380, protein: 35, carbs: 40, fat: 8 },
  dinner_omelette:      { meal_name: 'חביתה ערב', calories: 320, protein: 24, carbs: 5, fat: 22 },
  snack_protein_shake:  { meal_name: 'שייק חלבון', calories: 200, protein: 30, carbs: 8, fat: 3 },
  snack_cottage:        { meal_name: 'קוטג׳ 250g', calories: 210, protein: 28, carbs: 6, fat: 7 },
}

// ─── ROUTES ────────────────────────────────────────────────────────────────

// ─── AUTH ──────────────────────────────────────────────────────────────────

// POST /api/auth/register
app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const { email, password, name } = req.body
  if (!email || !password) return res.status(400).json({ error: 'missing_fields' })

  const existing = db.prepare('SELECT id FROM users_auth WHERE email = ?').get(email)
  if (existing) return res.status(409).json({ error: 'email_taken' })

  const displayName = name || email.split('@')[0]
  const password_hash = await bcrypt.hash(password, 10)

  // Create a dedicated users row for this user
  const userResult = db.prepare(
    'INSERT INTO users (name, daily_calorie_target, daily_protein_target) VALUES (?, 2500, 160)'
  ).run(displayName)
  const dbUserId = userResult.lastInsertRowid

  // Create matching user_stats row with 14-day trial
  const trialEnd = new Date(); trialEnd.setDate(trialEnd.getDate() + 14)
  db.prepare('INSERT INTO user_stats (id, tier, trial_ends_at, name) VALUES (?, ?, ?, ?)')
    .run(dbUserId, 'premium', trialEnd.toISOString(), displayName)

  // Create auth row linked to the new users.id
  const authResult = db.prepare(
    'INSERT INTO users_auth (email, password_hash, name, user_id) VALUES (?, ?, ?, ?)'
  ).run(email, password_hash, displayName, dbUserId)
  const userId = authResult.lastInsertRowid

  // Include dbUserId in JWT so middleware doesn't need a DB lookup
  const token = jwt.sign({ userId, dbUserId }, JWT_SECRET, { expiresIn: '30d' })

  // Send welcome email (non-blocking)
  sendWelcomeEmail(email, displayName)
    .then(() => db.prepare('UPDATE users_auth SET email_welcome_sent = 1 WHERE id = ?').run(userId))
    .catch(() => {})

  res.json({ token, user: { id: userId, email, name: displayName } })
}))

// POST /api/auth/login
app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'missing_fields' })

  const auth = db.prepare('SELECT * FROM users_auth WHERE email = ?').get(email)
  if (!auth) return res.status(401).json({ error: 'invalid_credentials' })

  const valid = await bcrypt.compare(password, auth.password_hash)
  if (!valid) return res.status(401).json({ error: 'invalid_credentials' })

  db.prepare('UPDATE users_auth SET last_login_at = ? WHERE id = ?').run(new Date().toISOString(), auth.id)

  const dbUserId = auth.user_id ?? 1
  const token = jwt.sign({ userId: auth.id, dbUserId }, JWT_SECRET, { expiresIn: '30d' })
  res.json({ token, user: { id: auth.id, email: auth.email, name: auth.name } })
}))

// POST /api/auth/google
app.post('/api/auth/google', asyncHandler(async (req, res) => {
  const { googleToken } = req.body
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(500).json({ error: 'Google auth not configured' })
  const ticket = await googleClient.verifyIdToken({
    idToken: googleToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  })
  const { email, name } = ticket.getPayload()
  let user = db.prepare('SELECT * FROM users_auth WHERE email = ?').get(email)
  if (!user) {
    const displayName = name || email.split('@')[0]

    // Create dedicated users row
    const userResult = db.prepare('INSERT INTO users (name) VALUES (?)').run(displayName)
    const dbUserId = userResult.lastInsertRowid

    // Create user_stats row with 14-day trial
    const trialEnd = new Date(); trialEnd.setDate(trialEnd.getDate() + 14)
    db.prepare('INSERT INTO user_stats (id, tier, trial_ends_at, name) VALUES (?, ?, ?, ?)')
      .run(dbUserId, 'premium', trialEnd.toISOString(), displayName)

    const result = db.prepare('INSERT INTO users_auth (email, password_hash, name, user_id) VALUES (?, ?, ?, ?)')
      .run(email, 'GOOGLE_AUTH', displayName, dbUserId)
    user = { id: result.lastInsertRowid, email, name: displayName, user_id: dbUserId }

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, displayName)
      .then(() => db.prepare('UPDATE users_auth SET email_welcome_sent = 1 WHERE id = ?').run(user.id))
      .catch(() => {})
  }

  db.prepare('UPDATE users_auth SET last_login_at = ? WHERE id = ?').run(new Date().toISOString(), user.id)

  const dbUserId = user.user_id ?? 1
  const token = jwt.sign({ userId: user.id, email: user.email, dbUserId }, JWT_SECRET, { expiresIn: '30d' })
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } })
}))

// GET /api/auth/me
app.get('/api/auth/me', requireAuth, (req, res) => {
  const auth = db.prepare('SELECT id, email, name, created_at FROM users_auth WHERE id = ?').get(req.userId)
  if (!auth) return res.status(404).json({ error: 'not_found' })
  res.json(auth)
})

// GET /api/user
app.get('/api/user', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.dbUserId)
  res.json(user)
})

// POST /api/user/onboarding
app.post('/api/user/onboarding', requireAuth, (req, res) => {
  const { name, daily_calorie_target, daily_protein_target, daily_water_target } = req.body
  const trialEnd = new Date()
  trialEnd.setDate(trialEnd.getDate() + 14)
  db.prepare(`
    UPDATE users SET name=?, daily_calorie_target=?, daily_protein_target=?,
    daily_water_target=?, premium_trial_ends_at=?, onboarded=1 WHERE id=?
  `).run(name, daily_calorie_target, daily_protein_target, daily_water_target || 2.5, trialEnd.toISOString(), req.dbUserId)
  res.json({ ok: true })
})

// GET /api/workouts?category=
app.get('/api/workouts', (req, res) => {
  const { category } = req.query
  const rows = category
    ? db.prepare('SELECT * FROM workouts WHERE category = ?').all(category)
    : db.prepare('SELECT * FROM workouts').all()
  res.json(rows)
})

// GET /api/workouts/recalculate?exercise=name&muscle_groups=chest,back
app.get('/api/workouts/recalculate', (req, res) => {
  const { muscle_groups } = req.query
  if (!muscle_groups) return res.json([])
  const groups = muscle_groups.split(',')
  const alternatives = db.prepare('SELECT * FROM workouts').all().filter(w => {
    const wGroups = (w.muscle_groups || '').split(',')
    return groups.some(g => wGroups.includes(g))
  })
  res.json(alternatives)
})

// GET /api/workouts/alternatives?muscle_group=chest&exclude_id=2  ← MUST be before /:id
app.get('/api/workouts/alternatives', (req, res) => {
  const { muscle_group, exclude_id } = req.query
  if (!muscle_group) return res.json([])
  const excludeId = parseInt(exclude_id) || 0

  let alts = db.prepare(`
    SELECT * FROM workouts WHERE muscle_group = ? AND id != ? LIMIT 3
  `).all(muscle_group, excludeId)

  if (alts.length === 0) {
    alts = db.prepare(`
      SELECT * FROM workouts
      WHERE (muscle_group = 'full_body' OR category = 'HIIT') AND id != ?
      LIMIT 3
    `).all(excludeId)
  }

  res.json(alts)
})

// GET /api/workouts/:id
app.get('/api/workouts/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(row)
})

function calcReadiness(stats, sessions) {
  let score = 100
  const sleepHours = parseFloat(stats.sleep) || 7
  if (sleepHours < 6) score -= 25
  else if (sleepHours < 7) score -= 10
  const recent = sessions.filter(s => {
    const diff = (Date.now() - new Date(s.date).getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 3
  }).length
  if (recent >= 3) score -= 20
  else if (recent >= 2) score -= 10
  if ((stats.resting_hr || 62) > 70) score -= 10
  return Math.max(0, Math.min(100, score))
}

// GET /api/dashboard
app.get('/api/dashboard', requireAuth, (req, res) => {
  const stats = db.prepare('SELECT * FROM user_stats WHERE id = ?').get(req.dbUserId)
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.dbUserId)
  const nextWorkout = db.prepare('SELECT * FROM workouts ORDER BY id LIMIT 1').get()

  const today = new Date().toISOString().split('T')[0]

  // Weekly sessions
  const sessions = db.prepare(`
    SELECT * FROM sessions WHERE date >= date('now', '-7 days') AND user_id = ? ORDER BY date ASC
  `).all(req.dbUserId)

  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const todayIdx = new Date().getDay()
  const weeklyActivity = days.map((label, i) => {
    const daySession = sessions.find(s => new Date(s.date).getDay() === i)
    const pct = daySession ? Math.min(100, Math.round(((daySession.calories || 0) / 500) * 100)) : 0
    return { label, pct, today: i === todayIdx }
  })

  // Today nutrition
  const nutrition = db.prepare(`
    SELECT SUM(calories) AS calories, SUM(protein) AS protein,
           SUM(carbs) AS carbs, SUM(fat) AS fat
    FROM nutrition_logs WHERE date = ? AND user_id = ?
  `).get(today, req.dbUserId)

  // Today readiness
  const readiness = db.prepare('SELECT * FROM daily_readiness WHERE date = ?').get(today)

  const totalCals = sessions.reduce((sum, s) => sum + (s.calories || 0), 0)
  const avgCals = sessions.length > 0 ? Math.round(totalCals / sessions.length) : 0

  // Calorie history for sparkline (last 9 days)
  const calorieRows = db.prepare(`
    SELECT date, SUM(calories) as total FROM sessions
    WHERE date >= date('now', '-9 days') AND user_id = ?
    GROUP BY date ORDER BY date ASC
  `).all(req.dbUserId)
  const calorieHistory = Array.from({ length: 9 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (8 - i))
    const dateStr = d.toISOString().split('T')[0]
    return calorieRows.find(r => r.date === dateStr)?.total || 0
  })

  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  const todayCals = sessions.filter(s => s.date === today).reduce((sum, s) => sum + (s.calories || 0), 0)
  const yesterdayCals = sessions.filter(s => s.date === yesterdayStr).reduce((sum, s) => sum + (s.calories || 0), 0)

  res.json({
    steps: stats.steps,
    stepGoal: stats.step_goal,
    streak: stats.streak,
    calories: totalCals || 2480,
    avgCalories: avgCals || 2150,
    calorieHistory,
    todayCalories: todayCals,
    yesterdayCalories: yesterdayCals,
    restingHR: stats.resting_hr,
    sleep: stats.sleep,
    hydration: stats.hydration,
    activeMinutes: stats.active_minutes,
    weeklyActivity,
    nextWorkout: nextWorkout ? {
      id: nextWorkout.id,
      name: nextWorkout.name,
      duration: nextWorkout.duration,
      intensity: nextWorkout.level,
    } : null,
    todayNutrition: {
      calories: nutrition?.calories || 0,
      protein: nutrition?.protein || 0,
      carbs: nutrition?.carbs || 0,
      fat: nutrition?.fat || 0,
    },
    targets: {
      calories: stats.daily_calorie_target || user.daily_calorie_target || 2500,
      protein: stats.daily_protein_target || user.daily_protein_target || 160,
      water: stats.daily_water_target || user.daily_water_target || 2.5,
    },
    readinessScore: readiness?.system_readiness_score ?? calcReadiness(stats, sessions),
  })
})

// GET /api/progress  [Free: 7 days, Pro: full history]
app.get('/api/progress', requireAuth, (req, res) => {
  const isPro = isUserPro(req.dbUserId)
  const stats = db.prepare('SELECT * FROM user_stats WHERE id = ?').get(req.dbUserId)

  const sessions = db.prepare(`
    SELECT s.*, w.name AS workout_name
    FROM sessions s
    LEFT JOIN workouts w ON s.workout_id = w.id
    WHERE s.user_id = ?
    ORDER BY s.date DESC LIMIT 10
  `).all(req.dbUserId)

  const totalSessionsRow = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE user_id = ?').get(req.dbUserId)
  const totalSessionsCount = totalSessionsRow?.count || 0

  const firstWeight = db.prepare('SELECT weight FROM weight_logs WHERE user_id = ? ORDER BY date ASC LIMIT 1').get(req.dbUserId)
  const lastWeight  = db.prepare('SELECT weight FROM weight_logs WHERE user_id = ? ORDER BY date DESC LIMIT 1').get(req.dbUserId)
  const weightDelta = (firstWeight && lastWeight)
    ? parseFloat((lastWeight.weight - firstWeight.weight).toFixed(1))
    : 0

  // Free: last 7 days only — Pro: full history
  const weightLogs = isPro
    ? db.prepare('SELECT weight, date, body_fat, notes FROM weight_logs WHERE user_id = ? ORDER BY date ASC').all(req.dbUserId)
    : db.prepare("SELECT weight, date, body_fat, notes FROM weight_logs WHERE user_id = ? AND date >= date('now', '-6 days') ORDER BY date ASC").all(req.dbUserId)

  // Personal Records (available to all)
  const personalRecords = db.prepare('SELECT exercise_name, weight, reps, date FROM personal_records ORDER BY date DESC').all()

  // Weekly Summary
  const weekStartDate = new Date(); weekStartDate.setDate(weekStartDate.getDate() - 6)
  const weekStart = weekStartDate.toISOString().split('T')[0]
  const weekSessionsRow = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE date >= ? AND user_id = ?').get(weekStart, req.dbUserId)
  const weekCaloriesRow = db.prepare('SELECT AVG(calories) as avg FROM sessions WHERE date >= ? AND calories > 0 AND user_id = ?').get(weekStart, req.dbUserId)
  const prevWeightRow   = db.prepare("SELECT weight FROM weight_logs WHERE date <= date('now', '-7 days') AND user_id = ? ORDER BY date DESC LIMIT 1").get(req.dbUserId)
  const weekWeightDelta = (lastWeight && prevWeightRow)
    ? parseFloat((lastWeight.weight - prevWeightRow.weight).toFixed(1))
    : 0

  // Total volume from workout_sets
  const volRow = db.prepare('SELECT SUM(weight * reps) as total FROM workout_sets WHERE user_id = ?').get(req.dbUserId)
  const totalVolume = Math.round(volRow?.total || 0)

  const today = new Date().toISOString().split('T')[0]
  const nutrition = db.prepare(`
    SELECT SUM(calories) AS total_calories, SUM(protein) AS total_protein,
           SUM(carbs) AS total_carbs, SUM(fat) AS total_fat
    FROM nutrition_logs WHERE date = ? AND user_id = ?
  `).get(today, req.dbUserId)

  const timeline = sessions.map(s => ({
    title: s.workout_name ? `Completed: ${s.workout_name}` : 'Workout Session',
    desc: `${s.duration ? Math.round(s.duration / 60) : 0} min • ${s.calories || 0} kcal`,
    icon: 'fitness_center',
    bgColor: 'bg-primary-container',
    iconColor: '#3a4a00',
    when: new Date(s.date).toLocaleDateString(),
  }))

  if (timeline.length === 0) {
    timeline.push(
      { title: 'New PR: Deadlift', desc: 'Reached 145kg for 3 reps', icon: 'fitness_center', bgColor: 'bg-primary-container', iconColor: '#3a4a00', when: 'Yesterday' },
      { title: 'Goal Met: Distance', desc: 'Monthly running goal achieved', icon: 'directions_run', bgColor: 'bg-secondary', iconColor: '#430c00', when: '3 Days Ago' },
    )
  }

  // ─── Badge progress ────────────────────────────────────────────────────────
  const sess = totalSessionsCount
  const streak = stats.streak || 0
  const badgeProgress = [
    {
      id: 'iron_giant',
      name: 'Iron Giant',
      desc: '1,000kg נפח כולל',
      icon: 'workspace_premium',
      color: '#beee00',
      current: Math.min(totalVolume, 1000),
      target: 1000,
      pct: Math.min(Math.round((totalVolume / 1000) * 100), 100),
      unlocked: totalVolume >= 1000,
      locked: false,
    },
    {
      id: 'consistent',
      name: 'עקבי',
      desc: '30 ימי Streak',
      icon: 'military_tech',
      color: '#edd13a',
      current: Math.min(streak, 30),
      target: 30,
      pct: Math.min(Math.round((streak / 30) * 100), 100),
      unlocked: streak >= 30,
      locked: false,
    },
    {
      id: 'centurion',
      name: 'Centurion',
      desc: '100 סשנים',
      icon: 'emoji_events',
      color: '#ff734a',
      current: Math.min(sess, 100),
      target: 100,
      pct: Math.min(sess, 100),
      unlocked: sess >= 100,
      locked: false,
    },
    {
      id: 'marathoner',
      name: 'Marathoner',
      desc: '42.2km ריצה',
      icon: 'directions_run',
      color: '#767575',
      current: 0,
      target: 42,
      pct: 0,
      unlocked: false,
      locked: true,
    },
  ]

  res.json({
    streak,
    currentWeight: stats.current_weight,
    bodyFat: stats.body_fat,
    weightDelta,
    weightLogs,
    totalSessions: sess,
    totalVolume,
    badgeProgress,
    isPro,
    personalRecords,
    weeklySummary: {
      sessions: weekSessionsRow?.count || 0,
      avgCalories: Math.round(weekCaloriesRow?.avg || 0),
      weightDelta: weekWeightDelta,
    },
    nutrition: {
      calories: nutrition?.total_calories || 0,
      protein: nutrition?.total_protein || 0,
      carbs: nutrition?.total_carbs || 0,
      fat: nutrition?.total_fat || 0,
    },
    timeline,
  })
})

// POST /api/sessions
app.post('/api/sessions', requireAuth, (req, res) => {
  const { workoutId, duration, calories, volume, date, sets } = req.body
  const result = db.prepare(
    'INSERT INTO sessions (workout_id, duration, calories, volume, date, user_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(workoutId, duration, calories, volume, date, req.dbUserId)
  const sessionId = result.lastInsertRowid

  // Save individual sets if provided
  if (Array.isArray(sets) && sets.length > 0) {
    const insertSet = db.prepare(
      'INSERT INTO workout_sets (session_id, exercise_name, weight, reps, rpe, is_ai_alternative, date, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    sets.forEach(s => insertSet.run(sessionId, s.exercise_name, s.weight || 0, s.reps || 0, s.rpe || 7, s.is_ai_alternative ? 1 : 0, date, req.dbUserId))
  }

  // Update streak once per day
  const today = new Date().toISOString().split('T')[0]
  const statsRow = db.prepare('SELECT streak_last_date FROM user_stats WHERE id = ?').get(req.dbUserId)
  if (statsRow && statsRow.streak_last_date !== today) {
    db.prepare('UPDATE user_stats SET streak = streak + 1, streak_last_date = ? WHERE id = ?').run(today, req.dbUserId)
  }

  res.json({ id: sessionId })
})

// GET /api/nutrition?date=  (history beyond today requires Pro)
app.get('/api/nutrition', requireAuth, (req, res) => {
  const { date } = req.query
  const today = new Date().toISOString().split('T')[0]
  const target = date || today
  if (target !== today && !isUserPro(req.dbUserId)) {
    return res.status(403).json({ error: 'premium_required', message: 'היסטוריית תזונה דורשת מנוי Pro' })
  }
  const stats = db.prepare('SELECT daily_calorie_target, daily_protein_target FROM user_stats WHERE id = ?').get(req.dbUserId)
  const meals = db.prepare('SELECT * FROM nutrition_logs WHERE date = ? AND user_id = ? ORDER BY id ASC').all(target, req.dbUserId)
  const totals = db.prepare(`
    SELECT SUM(calories) AS calories, SUM(protein) AS protein,
           SUM(carbs) AS carbs, SUM(fat) AS fat
    FROM nutrition_logs WHERE date = ? AND user_id = ?
  `).get(target, req.dbUserId)
  res.json({
    meals, totals,
    targets: { calories: stats?.daily_calorie_target || 2500, protein: stats?.daily_protein_target || 160 },
  })
})

// POST /api/nutrition
app.post('/api/nutrition', requireAuth, (req, res) => {
  const { date, meal_name, calories, protein, carbs, fat, entry_method } = req.body
  const d = date || new Date().toISOString().split('T')[0]
  const result = db.prepare(
    'INSERT INTO nutrition_logs (date, meal_name, calories, protein, carbs, fat, entry_method, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(d, meal_name, calories || 0, protein || 0, carbs || 0, fat || 0, entry_method || 'manual', req.dbUserId)
  res.json({ id: result.lastInsertRowid })
})

// POST /api/nutrition/quick-log/:preset
app.post('/api/nutrition/quick-log/:preset', requireAuth, (req, res) => {
  const preset = MEAL_PRESETS[req.params.preset]
  if (!preset) return res.status(404).json({ error: 'Preset not found' })
  const today = new Date().toISOString().split('T')[0]
  const result = db.prepare(
    'INSERT INTO nutrition_logs (date, meal_name, calories, protein, carbs, fat, entry_method, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(today, preset.meal_name, preset.calories, preset.protein, preset.carbs, preset.fat, 'one_tap', req.dbUserId)
  res.json({ id: result.lastInsertRowid, ...preset })
})

// GET /api/nutrition/macros/today
app.get('/api/nutrition/macros/today', requireAuth, (req, res) => {
  const today = new Date().toISOString().split('T')[0]
  const stats = db.prepare('SELECT daily_calorie_target, daily_protein_target FROM user_stats WHERE id = ?').get(req.dbUserId)
  const calTarget  = stats?.daily_calorie_target || 2500
  const protTarget = stats?.daily_protein_target || 160
  const carbTarget = Math.round(calTarget * 0.45 / 4)
  const fatTarget  = Math.round(calTarget * 0.25 / 9)
  const row = db.prepare(`
    SELECT SUM(calories) AS cal, SUM(protein) AS prot, SUM(carbs) AS carb, SUM(fat) AS fat
    FROM nutrition_logs WHERE date = ? AND user_id = ?
  `).get(today, req.dbUserId)
  const cal  = Math.round(row?.cal  || 0)
  const prot = Math.round(row?.prot || 0)
  const carb = Math.round(row?.carb || 0)
  const fat  = Math.round(row?.fat  || 0)
  res.json({
    calories: { consumed: cal,  target: calTarget,  pct: Math.min(100, Math.round(cal  / calTarget  * 100)) },
    protein:  { consumed: prot, target: protTarget, pct: Math.min(100, Math.round(prot / protTarget * 100)) },
    carbs:    { consumed: carb, target: carbTarget, pct: Math.min(100, Math.round(carb / carbTarget * 100)) },
    fat:      { consumed: fat,  target: fatTarget,  pct: Math.min(100, Math.round(fat  / fatTarget  * 100)) },
  })
})

// GET /api/nutrition/presets
app.get('/api/nutrition/presets', (req, res) => {
  res.json(Object.entries(MEAL_PRESETS).map(([key, val]) => ({ key, ...val })))
})

// GET /api/nutrition/recent — last 3 distinct meals logged by user
app.get('/api/nutrition/recent', requireAuth, (req, res) => {
  const meals = db.prepare(`
    SELECT meal_name, ROUND(AVG(calories)) AS calories,
           ROUND(AVG(protein),1) AS protein,
           ROUND(AVG(carbs),1) AS carbs,
           ROUND(AVG(fat),1) AS fat
    FROM nutrition_logs
    WHERE user_id = ?
    GROUP BY meal_name
    ORDER BY MAX(id) DESC
    LIMIT 3
  `).all(req.dbUserId)
  res.json(meals)
})

// GET /api/nutrition/search?q=...
// ─── READINESS ───────────────────────────────────────────────────────────────

function calculateReadiness(userId) {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  // 1. שינה — מ-readiness_logs
  const sleepLog = db.prepare('SELECT sleep_hours FROM readiness_logs WHERE user_id = ? AND date = ?').get(userId, today)
  // fallback: daily_readiness (ישן)
  const sleepFallback = db.prepare('SELECT sleep_hours FROM daily_readiness WHERE date = ?').get(today)
  const sleepHours = sleepLog?.sleep_hours ?? sleepFallback?.sleep_hours ?? 7
  const sleepScore = Math.min(100, Math.round((sleepHours / 8) * 100))

  // 2. הידרציה — מ-user_stats (water_today)
  const stats = db.prepare('SELECT * FROM user_stats WHERE id = ?').get(userId)
  const waterDate = stats?.water_date || ''
  const waterMl = waterDate === today ? Math.round((stats?.water_today || 0) * 1000) : 0
  const waterScore = Math.min(100, Math.round((waterMl / 2500) * 100))

  // 3. עומס אימון — כמה אימונים ב-3 ימים אחרונים
  const recentSessions = db.prepare(`SELECT COUNT(*) as count FROM sessions WHERE date >= date('now', '-3 days') AND user_id = ?`).get(userId)
  const sessionCount = recentSessions?.count || 0
  const loadScore = sessionCount >= 3 ? 60 : sessionCount === 2 ? 80 : 100

  // 4. תזונה — אחוז יעד קלוריות שהושג אתמול
  const yesterdayNutrition = db.prepare(`SELECT COALESCE(SUM(calories), 0) as total FROM nutrition_logs WHERE date = ? AND user_id = ?`).get(yesterday, userId)
  const calorieTarget = stats?.daily_calorie_target || 2500
  const nutritionPct = yesterdayNutrition?.total ? (yesterdayNutrition.total / calorieTarget) * 100 : 80
  const nutritionScore = nutritionPct >= 80 && nutritionPct <= 110 ? 100 : 70

  const totalScore = Math.round(
    sleepScore * 0.35 +
    waterScore * 0.25 +
    loadScore * 0.25 +
    nutritionScore * 0.15
  )

  let recommendation, intensity
  if (totalScore >= 80) { recommendation = 'מוכן לאימון עז! 💪'; intensity = 'HIGH' }
  else if (totalScore >= 60) { recommendation = 'אימון בינוני מומלץ'; intensity = 'MODERATE' }
  else { recommendation = 'יום מנוחה או פעילות קלה'; intensity = 'REST' }

  return {
    score: totalScore,
    recommendation,
    intensity,
    breakdown: {
      sleep:     { score: sleepScore,     hours: sleepHours,   label: 'שינה' },
      hydration: { score: waterScore,     ml: waterMl,         label: 'הידרציה' },
      load:      { score: loadScore,      sessions: sessionCount, label: 'עומס אימון' },
      nutrition: { score: nutritionScore, pct: Math.round(nutritionPct), label: 'תזונה' },
    },
  }
}

// GET /api/readiness
app.get('/api/readiness', requireAuth, (req, res) => {
  res.json(calculateReadiness(req.dbUserId))
})

// POST /api/readiness/sleep
app.post('/api/readiness/sleep', requireAuth, (req, res) => {
  const { hours } = req.body
  const today = new Date().toISOString().split('T')[0]
  db.prepare(`
    INSERT INTO readiness_logs (user_id, date, sleep_hours)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET sleep_hours = excluded.sleep_hours
  `).run(req.dbUserId, today, parseFloat(hours) || 7)
  res.json(calculateReadiness(req.dbUserId))
})

const COMMON_FOODS = [
  { name: 'אורז מבושל', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, per: 100 },
  { name: 'חזה עוף', calories: 165, protein: 31, carbs: 0, fat: 3.6, per: 100 },
  { name: 'ביצה', calories: 155, protein: 13, carbs: 1.1, fat: 11, per: 100 },
  { name: 'פסטה מבושלת', calories: 158, protein: 5.8, carbs: 31, fat: 0.9, per: 100 },
  { name: 'לחם', calories: 265, protein: 9, carbs: 49, fat: 3.2, per: 100 },
  { name: 'קוטג 5%', calories: 98, protein: 11, carbs: 3.5, fat: 5, per: 100 },
  { name: 'טונה בקופסה', calories: 116, protein: 26, carbs: 0, fat: 1, per: 100 },
  { name: 'בננה', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, per: 100 },
  { name: 'שיבולת שועל', calories: 389, protein: 17, carbs: 66, fat: 7, per: 100 },
  { name: 'שמן זית', calories: 884, protein: 0, carbs: 0, fat: 100, per: 100 },
  { name: 'אבוקדו', calories: 160, protein: 2, carbs: 9, fat: 15, per: 100 },
  { name: 'גבינה צהובה', calories: 402, protein: 25, carbs: 1.3, fat: 33, per: 100 },
  { name: 'חלב 3%', calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, per: 100 },
  { name: 'תפוח אדמה', calories: 77, protein: 2, carbs: 17, fat: 0.1, per: 100 },
  { name: 'ברוקולי', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, per: 100 },
]

const ISRAELI_FOODS = [
  { name: 'קוטג׳ 5%', calories: 98, protein: 11, carbs: 3.5, fat: 5, per: 100 },
  { name: 'גבינה לבנה 5%', calories: 75, protein: 8, carbs: 3, fat: 5, per: 100 },
  { name: 'טבעול חומוס', calories: 160, protein: 8, carbs: 14, fat: 8, per: 100 },
  { name: 'לבן 1%', calories: 40, protein: 3.5, carbs: 4.5, fat: 1, per: 100 },
  { name: 'שמנת חמוצה 15%', calories: 150, protein: 3, carbs: 4, fat: 15, per: 100 },
  { name: 'גבינה צפתית 5%', calories: 160, protein: 17, carbs: 1, fat: 10, per: 100 },
  { name: 'עגבנייה', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, per: 100 },
  { name: 'מלפפון', calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1, per: 100 },
  { name: 'פלפל אדום', calories: 31, protein: 1, carbs: 6, fat: 0.3, per: 100 },
  { name: 'חציל', calories: 25, protein: 1, carbs: 6, fat: 0.2, per: 100 },
  { name: 'זוקיני', calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3, per: 100 },
  { name: 'חומוס מבושל', calories: 164, protein: 8.9, carbs: 27, fat: 2.6, per: 100 },
  { name: 'עדשים מבושלות', calories: 116, protein: 9, carbs: 20, fat: 0.4, per: 100 },
  { name: 'שעועית לבנה', calories: 127, protein: 8.7, carbs: 22, fat: 0.5, per: 100 },
  { name: 'פול מבושל', calories: 110, protein: 7.6, carbs: 19.7, fat: 0.4, per: 100 },
  { name: 'לחם קל', calories: 200, protein: 9, carbs: 36, fat: 2, per: 100 },
  { name: 'פיתה', calories: 275, protein: 9, carbs: 55, fat: 1, per: 100 },
  { name: 'לאפה', calories: 290, protein: 9, carbs: 57, fat: 3, per: 100 },
  { name: 'במבה', calories: 540, protein: 11, carbs: 57, fat: 31, per: 100 },
  { name: 'ביסלי גריל', calories: 470, protein: 8, carbs: 67, fat: 19, per: 100 },
  { name: 'תחינה גולמית', calories: 570, protein: 17, carbs: 21, fat: 48, per: 100 },
  { name: 'חלבה', calories: 500, protein: 12, carbs: 55, fat: 28, per: 100 },
  { name: 'שניצל עוף מטוגן', calories: 230, protein: 19, carbs: 12, fat: 12, per: 100 },
  { name: 'קציצות בקר', calories: 250, protein: 17, carbs: 8, fat: 17, per: 100 },
  { name: 'המבורגר 200g', calories: 350, protein: 25, carbs: 0, fat: 28, per: 200 },
  { name: 'סרדינים בשמן', calories: 208, protein: 24.6, carbs: 0, fat: 11.5, per: 100 },
  { name: 'דג מוסר ים', calories: 124, protein: 20, carbs: 0, fat: 4.4, per: 100 },
  { name: 'שוקולד מריר 70%', calories: 598, protein: 7.8, carbs: 45, fat: 43, per: 100 },
  { name: 'עוגיות לוטוס', calories: 480, protein: 4.5, carbs: 70, fat: 22, per: 100 },
]

app.get('/api/nutrition/search', requireAuth, (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim()
  if (!q) return res.json([])

  // Search user history first
  const history = db.prepare(`
    SELECT meal_name AS name,
           ROUND(AVG(calories)) AS calories,
           ROUND(AVG(protein),1) AS protein,
           ROUND(AVG(carbs),1) AS carbs,
           ROUND(AVG(fat),1) AS fat,
           100 AS per
    FROM nutrition_logs
    WHERE lower(meal_name) LIKE ? AND user_id = ?
    GROUP BY meal_name
    ORDER BY MAX(id) DESC
    LIMIT 4
  `).all(`%${q}%`, req.dbUserId)

  // Filter all foods
  const allFoods = [...COMMON_FOODS, ...ISRAELI_FOODS]
  const common = allFoods.filter(f => f.name.toLowerCase().includes(q)).slice(0, 6)

  // Merge, deduplicate by name
  const seen = new Set(history.map(h => h.name))
  const merged = [...history, ...common.filter(c => !seen.has(c.name))].slice(0, 10)
  res.json(merged)
})

// GET /api/nutrition/gap-filler
app.get('/api/nutrition/gap-filler', requireAuth, checkPremium, (req, res) => {
  const today = new Date().toISOString().split('T')[0]
  const stats = db.prepare('SELECT * FROM user_stats WHERE id = ?').get(req.dbUserId)
  const user  = db.prepare('SELECT * FROM users WHERE id = ?').get(req.dbUserId)

  const totals = db.prepare(`
    SELECT SUM(calories) AS calories, SUM(protein) AS protein
    FROM nutrition_logs WHERE date = ? AND user_id = ?
  `).get(today, req.dbUserId)

  // Today's session + workout category for MET
  const todaySession = db.prepare(`
    SELECT s.duration, w.category FROM sessions s
    LEFT JOIN workouts w ON s.workout_id = w.id
    WHERE s.date = ? AND s.duration > 0 AND s.user_id = ?
    ORDER BY s.id DESC LIMIT 1
  `).get(today, req.dbUserId)

  const MET = { HIIT: 8, STRENGTH: 5, CARDIO: 7, YOGA: 3 }
  const met = MET[todaySession?.category?.toUpperCase()] || 0
  const weightKg = stats?.current_weight || 75
  const durationHours = (todaySession?.duration || 0) / 3600
  const caloriesBurned = Math.round(met * weightKg * durationHours)

  const caloriesConsumed = Math.round(totals?.calories || 0)
  const proteinConsumed  = Math.round(totals?.protein  || 0)
  const caloriesTarget   = stats?.daily_calorie_target || 2500
  const proteinTarget    = stats?.daily_protein_target  || 160

  const caloriesGap = caloriesTarget + caloriesBurned - caloriesConsumed
  const proteinGap  = proteinTarget  - proteinConsumed
  const postWorkoutWindow = !!todaySession

  // Build smart suggestions
  const suggestions = []
  const PROTEIN_FOODS = [
    { name: 'חזה עוף 150g',    calories: 165, protein: 35, timing: 'עכשיו',       reason: 'חלבון מלא לשיקום שריר' },
    { name: 'טונה 120g',       calories: 110, protein: 28, timing: 'עכשיו',       reason: 'חלבון מהיר ספיגה' },
    { name: 'ביצים × 3',       calories: 210, protein: 18, timing: 'עכשיו',       reason: 'חלבון + שומן בריא' },
    { name: 'שייק חלבון 1 מנה', calories: 160, protein: 30, timing: 'עכשיו',      reason: 'חלבון מהיר לחלון ריקברי' },
    { name: 'קוטג׳ 250g',       calories: 210, protein: 28, timing: 'לפני שינה', reason: 'קזאין לריקברי לילי' },
  ]
  const CARB_FOODS = [
    { name: 'אורז מבושל 150g',  calories: 195, protein: 4, timing: 'עכשיו',  reason: 'מילוי גליקוגן אחרי אימון' },
    { name: 'בטטה 200g',        calories: 172, protein: 4, timing: 'עכשיו',  reason: 'פחמימות מורכבות + ויטמינים' },
    { name: 'בננה 1',           calories: 90,  protein: 1, timing: 'עכשיו',  reason: 'פחמימות מהירות + אשלגן' },
  ]

  if (caloriesGap < 0) {
    // Exceeded target
  } else {
    if (postWorkoutWindow && proteinGap > 0) {
      suggestions.push({ ...PROTEIN_FOODS[3], reason: `חלון ריקברי פתוח — ${PROTEIN_FOODS[3].reason}` })
    }
    if (proteinGap > 25) {
      suggestions.push(PROTEIN_FOODS[0])
      suggestions.push(PROTEIN_FOODS[4])
    } else if (proteinGap > 15) {
      suggestions.push(PROTEIN_FOODS[1])
    } else if (proteinGap > 0) {
      suggestions.push(PROTEIN_FOODS[2])
    }
    if (caloriesGap > 300 && postWorkoutWindow) {
      suggestions.push(CARB_FOODS[0])
    } else if (caloriesGap > 200) {
      suggestions.push(CARB_FOODS[2])
    }
  }

  // Deduplicate
  const seen = new Set()
  const uniqueSuggestions = suggestions.filter(s => {
    if (seen.has(s.name)) return false
    seen.add(s.name); return true
  })

  let message
  if (caloriesGap < 0) {
    message = `עברת את היעד ב-${Math.abs(caloriesGap)} קאל — בסדר גמור לפי הסה"כ השבועי`
  } else if (postWorkoutWindow) {
    message = `חלון ריקברי פתוח! נשרפו ~${caloriesBurned} קאל — תזין ${caloriesGap} קאל ו-${proteinGap}g חלבון`
  } else {
    message = `נותרו ${caloriesGap} קאל ו-${proteinGap}g חלבון להשלמת היעד היומי`
  }

  res.json({
    caloriesBurned,
    caloriesConsumed,
    caloriesTarget,
    proteinConsumed,
    proteinTarget,
    caloriesGap,
    proteinGap,
    postWorkoutWindow,
    message,
    suggestions: uniqueSuggestions.slice(0, 4),
  })
})

// GET /api/nutrition/scan/:barcode
app.get('/api/nutrition/scan/:barcode', (req, res) => {
  const url = `https://world.openfoodfacts.org/api/v0/product/${req.params.barcode}.json`
  https.get(url, { headers: { 'User-Agent': 'KineticApp/1.0' } }, (apiRes) => {
    let body = ''
    apiRes.on('data', chunk => { body += chunk })
    apiRes.on('end', () => {
      try {
        const data = JSON.parse(body)
        if (data.status !== 1 || !data.product) {
          return res.json({ found: false })
        }
        const p = data.product
        const n = p.nutriments || {}
        res.json({
          found: true,
          name: p.product_name || p.product_name_he || 'מוצר לא ידוע',
          calories_per_100g: Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0),
          protein_per_100g: parseFloat((n.proteins_100g || 0).toFixed(1)),
          carbs_per_100g: parseFloat((n.carbohydrates_100g || 0).toFixed(1)),
          fat_per_100g: parseFloat((n.fat_100g || 0).toFixed(1)),
          image_url: p.image_front_small_url || p.image_url || null,
        })
      } catch {
        res.json({ found: false })
      }
    })
  }).on('error', () => res.json({ found: false }))
})


// GET /api/supplements
app.get('/api/supplements', requireAuth, (req, res) => {
  const supps = db.prepare('SELECT * FROM supplements ORDER BY id ASC').all()
  const result = supps.map(s => ({
    ...s,
    pct_remaining: s.servings_total > 0 ? Math.round((s.servings_remaining / s.servings_total) * 100) : 0,
    low_stock: s.servings_remaining < 7,
  }))
  res.json(result)
})

// POST /api/supplements/take/:id
app.post('/api/supplements/take/:id', requireAuth, (req, res) => {
  const supp = db.prepare('SELECT * FROM supplements WHERE id = ?').get(req.params.id)
  if (!supp) return res.status(404).json({ error: 'Not found' })
  const today = new Date().toISOString().split('T')[0]

  // Already taken today — no change
  if (supp.last_taken === today) {
    return res.json({ ok: true, already_taken: true, servings_remaining: supp.servings_remaining })
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const newStreak = supp.last_taken === yesterday ? supp.current_streak + 1 : 1
  const newRemaining = Math.max(0, supp.servings_remaining - 1)

  db.prepare(`
    UPDATE supplements
    SET servings_remaining = ?, current_streak = ?, last_taken = ?
    WHERE id = ?
  `).run(newRemaining, newStreak, today, supp.id)

  res.json({
    ok: true,
    servings_remaining: newRemaining,
    current_streak: newStreak,
    low_stock: newRemaining < 7,
  })
})

// POST /api/supplements — add new
app.post('/api/supplements', requireAuth, (req, res) => {
  const { name, servings_remaining, cost_per_serving } = req.body
  if (!name || !servings_remaining) return res.status(400).json({ error: 'name and servings_remaining required' })
  const total = servings_remaining
  const result = db.prepare(
    'INSERT INTO supplements (name, servings_remaining, servings_total, cost_per_serving) VALUES (?, ?, ?, ?)'
  ).run(name, total, total, cost_per_serving || 0)
  res.json({ id: result.lastInsertRowid })
})

// PATCH /api/supplements/:id — restock
app.patch('/api/supplements/:id', requireAuth, (req, res) => {
  const supp = db.prepare('SELECT * FROM supplements WHERE id = ?').get(req.params.id)
  if (!supp) return res.status(404).json({ error: 'Not found' })
  const { servings_remaining, cost_per_serving } = req.body
  const newTotal = servings_remaining || supp.servings_remaining
  db.prepare(`
    UPDATE supplements SET servings_remaining = ?, servings_total = ?, cost_per_serving = COALESCE(?, cost_per_serving)
    WHERE id = ?
  `).run(newTotal, Math.max(newTotal, supp.servings_total), cost_per_serving || null, supp.id)
  res.json({ ok: true })
})

// POST /api/readiness/morning-checkin
app.post('/api/readiness/morning-checkin', requireAuth, (req, res) => {
  const { sleep_hours, subjective_score, notes } = req.body
  const today = new Date().toISOString().split('T')[0]
  const system_readiness_score = Math.round((sleep_hours / 9) * 50 + (subjective_score / 10) * 50)
  db.prepare(`
    INSERT INTO daily_readiness (date, sleep_hours, subjective_score, system_readiness_score, notes)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      sleep_hours=excluded.sleep_hours,
      subjective_score=excluded.subjective_score,
      system_readiness_score=excluded.system_readiness_score,
      notes=excluded.notes
  `).run(today, sleep_hours, subjective_score, system_readiness_score, notes || '')
  db.prepare('UPDATE user_stats SET sleep = ? WHERE id = ?').run(`${sleep_hours}h`, req.dbUserId)
  res.json({ system_readiness_score })
})

// GET /api/readiness/today
app.get('/api/readiness/today', requireAuth, (req, res) => {
  const today = new Date().toISOString().split('T')[0]
  const row = db.prepare('SELECT * FROM daily_readiness WHERE date = ?').get(today)
  res.json(row || null)
})

// POST /api/weight
app.post('/api/weight', requireAuth, (req, res) => {
  const { weight, date, body_fat, notes } = req.body
  const d = date || new Date().toISOString().split('T')[0]
  db.prepare('DELETE FROM weight_logs WHERE date = ? AND user_id = ?').run(d, req.dbUserId)
  const result = db.prepare('INSERT INTO weight_logs (weight, date, body_fat, notes, user_id) VALUES (?, ?, ?, ?, ?)').run(weight, d, body_fat ?? null, notes ?? '', req.dbUserId)
  db.prepare('UPDATE user_stats SET current_weight = ? WHERE id = ?').run(weight, req.dbUserId)
  res.json({ id: result.lastInsertRowid })
})

// PATCH /api/stats
app.patch('/api/stats', requireAuth, (req, res) => {
  const allowed = ['steps', 'step_goal', 'resting_hr', 'sleep', 'hydration', 'active_minutes', 'body_fat', 'gender', 'ai_persona']
  const updates = Object.entries(req.body).filter(([k]) => allowed.includes(k))
  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields' })
  const sql = updates.map(([k]) => `${k} = ?`).join(', ')
  db.prepare(`UPDATE user_stats SET ${sql} WHERE id = ?`).run(...updates.map(([, v]) => v), req.dbUserId)
  res.json({ ok: true })
})

// PATCH /api/stats/water
app.patch('/api/stats/water', requireAuth, (req, res) => {
  const { amount } = req.body
  const today = new Date().toISOString().split('T')[0]
  const row = db.prepare('SELECT water_today, water_date FROM user_stats WHERE id = ?').get(req.dbUserId)
  const current = row?.water_date === today ? (row.water_today || 0) : 0
  const updated = Math.round((current + (parseFloat(amount) || 0)) * 100) / 100
  db.prepare('UPDATE user_stats SET water_today = ?, water_date = ? WHERE id = ?')
    .run(updated, today, req.dbUserId)
  res.json({ water_today: updated, date: today })
})

function buildSystemPrompt(personaPrompt, userData) {
  const personaName = userData.personaName || 'TOM'

  const TOM_PERSONA = `אתה TOM (Tough & Optimized Mentor), המאמן האישי והבלעדי של אפליקציית Kinetic.
התפקיד שלך הוא לא רק לענות על שאלות, אלא להוביל את המשתמש לתוצאות שיא בכושר, תזונה ומנטליות.

### האישיות שלך:
1. מקצועי אך נגיש: אתה מדבר בגובה העיניים, בשפה של "מתאמנים" (סקוואטים, חלבון, מאזן קלורי, דדליפט).
2. מוטיבציוני: אתה לא מוותר למשתמש, אבל אתה תמיד תומך. אם הוא "זייף" באוכל — אתה עוזר לו לחזור למסלול בלי שיפוטיות.
3. קצר ולעניין: מתאמנים הם אנשים עסוקים. אל תחפור. תן ערך מקסימלי במינימום טקסט.
4. מבוסס נתונים: תמיד תתייחס לנתונים של המשתמש (משקל, קלוריות, חלבון, streak) כדי לתת תשובות מותאמות אישית.

### חוקי הברזל שלך:
- תמיד תענה בעברית טבעית וזורמת.
- אם המשתמש שואל על אימון, תמליץ לו על משהו שמתאים למשקל וליעדים שלו.
- אם חסר לו חלבון להיום, תציע לו ארוחות ספציפיות (טונה, חזה עוף, חלבון מהצומח).
- פעם ב-3 הודעות, תן לו "דחיפה" קטנה לגבי ה-Streak שלו כדי לשמור על מוטיבציה.
- אם המשתמש כותב משהו לא קשור לכושר/תזונה, תחזיר אותו בעדינות לנושא.
- השתמש בפורמט Markdown (בולטים, הדגשות) כדי שהתשובה תהיה קריאה.
- לא אומר "כמובן" או "בהחלט" — אתה מדבר כמו בן אדם.`

  const JANE_PERSONA = `את JANE — חברה תומכת שקורה להיות תזונאית ומאמנת.
את חמה, אמפתית, עם הומור עדין. מדברת בגובה העיניים, לא שיפוטית, מעודדת.
דוגמאות לסגנון:
- "היי! איך הלך היום? ראיתי שאכלת טוב בבוקר 😊"
- "אוקיי, אני מבינה שאין כוח, אבל 20 דקות זה הכל!"
- "גאה בך! ה-streak שלך מדהים ממש"
- "שמעי, את יכולה גם לאכול משהו טעים ועדיין להגיע ליעד"
את זוכרת פרטים ומתייחסת אישית. לא אומרת "בוודאי" או "כמובן".`

  const personaText = personaName === 'JANE' ? JANE_PERSONA : TOM_PERSONA

  return `${personaText}

הידע המקצועי שלך:
כושר: תכנון תוכניות (PPL, Upper/Lower, Full Body, Bro Split), עומס פרוגרסיבי, periodization, deload, RPE, 1RM, ריקברי, שינה, ניהול עייפות, ביצוע נכון ומניעת פציעות.
תזונה: TDEE, BMR, מאקרו לפי מטרה, lean bulk, cut, תזמון ארוחות, pre/post workout nutrition, תוספים (קריאטין, חלבון, BCAA, קפאין, בטא אלנין), תזונה ישראלית נגישה.

כשמשתמש מבקש תוכנית אימון — בנה תוכנית מפורטת עם ימים, תרגילים, סטים, חזרות והסבר קצר.

נתוני ${userData.name} עכשיו:
- משקל: ${userData.currentWeight}kg | Streak: ${userData.streak} ימים
- קלוריות: ${userData.todayCalories}/${userData.calorieTarget} | חלבון: ${userData.todayProtein}/${userData.proteinTarget}g
- אימון אחרון: ${userData.lastSession || 'אין עדיין'} | Readiness: ${userData.readinessScore ?? 'לא נמדד'}
${userData.latestPR ? `- שיא אחרון (PR): ${userData.latestPR}` : ''}

כללים: ענה תמיד בעברית. היה ספציפי לנתונים. אל תתן עצות גנריות. דבר כמו חבר, לא כמו בוט.`
}

const GEMINI_MODELS = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash']

async function callGeminiDirectly(prompt) {
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
    ]
  })

  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
    const data = await response.json()

    if (data.error) {
      console.error(`GEMINI [${model}] error:`, data.error.message)
      continue // try next model
    }

    if (!data.candidates || data.candidates.length === 0) {
      console.error(`GEMINI [${model}] empty response`)
      continue
    }

    return data.candidates[0].content.parts[0].text
  }

  throw new Error('All Gemini models failed')
}

// POST /api/ai/chat
app.post('/api/ai/chat', requireAuth, async (req, res) => {
  try {
    const { message, systemPrompt, clientContext } = req.body
    const apiKey = process.env.GEMINI_API_KEY
    const userId = req.dbUserId
    const today = new Date().toISOString().split('T')[0]

    // Pull user data safely — each query wrapped so a missing column never crashes the route
    let stats = {}
    try {
      stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(userId) || {}
    } catch (e) {
      console.log('⚠️ user_stats query failed, using defaults:', e.message)
    }

    let user = {}
    try {
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) || {}
    } catch (e) {
      console.log('⚠️ users query failed:', e.message)
    }

    let todayNutrition = { calories: 0, protein: 0 }
    try {
      todayNutrition = db.prepare(
        'SELECT SUM(calories) AS calories, SUM(protein) AS protein FROM nutrition_logs WHERE date = ? AND user_id = ?'
      ).get(today, userId) || todayNutrition
    } catch (e) {
      console.log('⚠️ nutrition_logs query failed:', e.message)
    }

    let lastSession = null
    try {
      lastSession = db.prepare(`
        SELECT s.date, w.name AS workout_name FROM sessions s
        LEFT JOIN workouts w ON s.workout_id = w.id
        WHERE s.user_id = ? ORDER BY s.date DESC LIMIT 1
      `).get(userId)
    } catch (e) {
      console.log('⚠️ sessions query failed:', e.message)
    }

    let lastWeight = null
    try {
      lastWeight = db.prepare(
        'SELECT weight FROM weight_logs WHERE user_id = ? ORDER BY date DESC LIMIT 1'
      ).get(userId)
    } catch (e) {
      console.log('⚠️ weight_logs query failed:', e.message)
    }

    let latestPR = null
    try {
      latestPR = db.prepare(
        'SELECT exercise_name, weight FROM personal_records WHERE user_id = ? ORDER BY date DESC LIMIT 1'
      ).get(userId)
    } catch (e) {
      console.log('⚠️ personal_records query failed:', e.message)
    }

    const userData = {
      name:           user?.name || 'מתאמן',
      currentWeight:  lastWeight?.weight || stats?.current_weight || '—',
      streak:         stats?.streak || 0,
      calorieTarget:  user?.daily_calorie_target || 2500,
      proteinTarget:  user?.daily_protein_target || 160,
      todayCalories:  clientContext?.todayCalories ?? Math.round(todayNutrition?.calories || 0),
      todayProtein:   clientContext?.todayProtein  ?? Math.round(todayNutrition?.protein  || 0),
      readinessScore: clientContext?.readinessScore ?? null,
      lastSession:    clientContext?.lastSession ?? (lastSession
        ? `${lastSession.workout_name || 'אימון'} לפני ${Math.round((Date.now() - new Date(lastSession.date).getTime()) / 86400000)} ימים`
        : 'אין עדיין'),
      latestPR: latestPR ? `${latestPR.exercise_name} — ${latestPR.weight} ק"ג` : null,
    }

    // Pull last 10 messages for conversational memory
    const history = db.prepare(
      'SELECT role, content FROM chat_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 10'
    ).all(req.dbUserId).reverse()

    // Save user message
    db.prepare('INSERT INTO chat_messages (user_id, role, content) VALUES (?, ?, ?)').run(req.dbUserId, 'user', message)

    // Build contents array: system prompt as first user turn, then history, then current message
    const sysPrompt = buildSystemPrompt(systemPrompt, userData)
    const contents = [
      { role: 'user', parts: [{ text: sysPrompt }] },
      { role: 'model', parts: [{ text: 'מובן, אני מוכן לעזור!' }] },
      ...history.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
      { role: 'user', parts: [{ text: message }] },
    ]

    const tools = [{
      functionDeclarations: [{
        name: 'add_nutrition_log',
        description: 'הוספת מאכל או ארוחה ליומן התזונה של המשתמש',
        parameters: {
          type: 'OBJECT',
          properties: {
            meal_name: { type: 'string',  description: 'שם המאכל (למשל: חביתה, שייק חלבון)' },
            calories:  { type: 'number',  description: 'כמות הקלוריות המשוערת' },
            protein:   { type: 'number',  description: 'כמות החלבון בגרמים' }
          },
          required: ['meal_name', 'calories', 'protein']
        }
      }]
    }]

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, tools })
    })

    const data = await response.json()

    if (data.error) {
      console.error('Google Error:', data.error)
      return res.json({ content: `שגיאת AI: ${data.error.message}` })
    }

    const candidate = data.candidates?.[0]
    const part = candidate?.content?.parts?.[0]

    // Handle function call from Gemini
    if (part?.functionCall?.name === 'add_nutrition_log') {
      const { meal_name, calories, protein } = part.functionCall.args
      db.prepare(
        'INSERT INTO nutrition_logs (user_id, date, meal_name, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, 0, 0)'
      ).run(req.dbUserId, today, meal_name, Math.round(calories), Math.round(protein))
      const confirmText = `✅ הוספתי "${meal_name}" ליומן: ${Math.round(calories)} קל׳ | ${Math.round(protein)}g חלבון`
      db.prepare('INSERT INTO chat_messages (user_id, role, content) VALUES (?, ?, ?)').run(req.dbUserId, 'model', confirmText)
      return res.json({ content: confirmText, action: 'nutrition_logged' })
    }

    const aiResponse = part?.text || 'תום כרגע לא זמין.'
    db.prepare('INSERT INTO chat_messages (user_id, role, content) VALUES (?, ?, ?)').run(req.dbUserId, 'model', aiResponse)
    res.json({ content: aiResponse })

  } catch (error) {
    console.error('Critical Error:', error)
    res.status(500).json({ content: 'השרת נתקל בשגיאה קריטית בתקשורת' })
  }
})

// POST /api/ai/generate-plan
app.post('/api/ai/generate-plan', requireAuth, asyncHandler(async (req, res) => {
  const { goal, daysPerWeek, equipment, limitations, level, gender } = req.body
  const apiKey = process.env.GEMINI_API_KEY  // used for the `if (apiKey)` guard below

  const prompt = `בנה תוכנית אימון מותאמת אישית בפורמט JSON בלבד (ללא טקסט נוסף):
מטרה: ${goal}
ימים בשבוע: ${daysPerWeek}
ציוד: ${equipment}
רמה: ${level}
מגבלות: ${limitations || 'אין'}
מגדר: ${gender || 'male'}

החזר JSON בדיוק בפורמט:
{
  "name": "שם התוכנית",
  "description": "תיאור קצר",
  "days": [
    {
      "dayNumber": 1,
      "name": "שם היום",
      "muscleGroups": "קבוצות שריר",
      "exercises": [
        { "name": "שם תרגיל", "sets": 3, "reps": "8-12", "notes": "הערות" }
      ]
    }
  ]
}`

  let plan

  if (apiKey) {
    try {
      const text = await callGeminiDirectly(prompt)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) plan = JSON.parse(jsonMatch[0])
    } catch (e) {
      console.error('AI generate-plan ERROR:', e)
    }
  }

  // Fallback plan if no API key or parse failed
  if (!plan) {
    const days = parseInt(daysPerWeek) || 3
    plan = {
      name: `תוכנית ${days} ימים — ${goal}`,
      description: `תוכנית מותאמת לרמה ${level} עם ${equipment}`,
      days: Array.from({ length: days }, (_, i) => ({
        dayNumber: i + 1,
        name: ['חזה וטריצפס', 'גב ובייספס', 'רגליים ובטן', 'כתפיים ופוש', 'פול דיי', 'פול בודי', 'קרדיו'][i] || `יום ${i + 1}`,
        muscleGroups: ['חזה, טריצפס', 'גב, בייספס', 'רגליים', 'כתפיים', 'כל הגוף', 'כל הגוף', 'לב-ריאה'][i] || 'כל הגוף',
        exercises: [
          { name: 'לחיצת חזה', sets: 4, reps: '8-12', notes: 'שמור על גב ישר' },
          { name: 'כפיפות ידיים', sets: 3, reps: '10-15', notes: '' },
          { name: 'מתח רחב', sets: 3, reps: '6-10', notes: 'בקרה בירידה' },
          { name: 'סקוואט', sets: 4, reps: '8-12', notes: 'ברכיים מעל בהונות' },
        ],
      })),
    }
  }

  // Save to DB
  const insertPlan = db.prepare('INSERT INTO workout_plans (name, description, is_custom) VALUES (?, ?, 1)')
  const insertDay = db.prepare('INSERT INTO plan_days (plan_id, day_number, name, muscle_groups) VALUES (?, ?, ?, ?)')
  const insertEx = db.prepare('INSERT INTO plan_day_exercises (plan_day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)')

  const planRow = insertPlan.run(plan.name, plan.description)
  const planId = planRow.lastInsertRowid

  for (const day of plan.days || []) {
    const dayRow = insertDay.run(planId, day.dayNumber, day.name, day.muscleGroups)
    for (const ex of day.exercises || []) {
      insertEx.run(dayRow.lastInsertRowid, ex.name, ex.sets, ex.reps)
    }
  }

  res.json({ plan, planId })
}))

// ─── USERS ──────────────────────────────────────────────────────────────────

// GET /api/users/me
app.get('/api/users/me', requireAuth, (req, res) => {
  const s = db.prepare('SELECT * FROM user_stats WHERE id = ?').get(req.dbUserId)
  const u = db.prepare('SELECT is_pro FROM users WHERE id = ?').get(req.dbUserId)
  const trialDate = s.trial_ends_at ? new Date(s.trial_ends_at) : null
  const now = new Date()
  const daysLeft = trialDate ? Math.max(0, Math.ceil((trialDate - now) / 86400000)) : 0
  const isPremium = s.tier === 'premium' && trialDate && trialDate > now
  const today = new Date().toISOString().split('T')[0]
  res.json({
    name: s.name,
    tier: s.tier || 'free',
    isPro: u?.is_pro === 1,
    trialEndsAt: s.trial_ends_at,
    daysLeft,
    isPremium,
    dailyCalorieTarget: s.daily_calorie_target,
    dailyProteinTarget: s.daily_protein_target,
    onboardingDone: s.onboarding_done || 0,
    tourDone: s.tour_done === 1,
    gender: s.gender || 'male',
    aiPersona: s.ai_persona || 'auto',
    waterToday: s.water_date === today ? (s.water_today || 0) : 0,
  })
})

// PATCH /api/users/tour-done
app.patch('/api/users/tour-done', requireAuth, (req, res) => {
  db.prepare('UPDATE user_stats SET tour_done = 1 WHERE id = ?').run(req.dbUserId)
  res.json({ success: true })
})

// PATCH /api/users/reset-tour
app.patch('/api/users/reset-tour', requireAuth, (req, res) => {
  db.prepare('UPDATE user_stats SET tour_done = 0 WHERE id = ?').run(req.dbUserId)
  res.json({ success: true })
})

// ─── PUSH NOTIFICATIONS ──────────────────────────────────────────────────────

async function sendPushToUser(userId, title, body, url = '/dashboard', tag = 'kinetic') {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return
  const subs = db.prepare('SELECT subscription, endpoint FROM push_subscriptions WHERE user_id = ?').all(userId)
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        JSON.parse(sub.subscription),
        JSON.stringify({ title, body, url, tag })
      )
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(sub.endpoint)
      }
    }
  }
}

// POST /api/push/subscribe
app.post('/api/push/subscribe', requireAuth, (req, res) => {
  const subscription = req.body
  const endpoint = subscription.endpoint || ''
  db.prepare(`
    INSERT INTO push_subscriptions (user_id, subscription, endpoint)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, endpoint) DO UPDATE SET subscription = excluded.subscription
  `).run(req.dbUserId, JSON.stringify(subscription), endpoint)
  res.json({ success: true })
})

// POST /api/push/unsubscribe
app.post('/api/push/unsubscribe', requireAuth, (req, res) => {
  const { endpoint } = req.body
  if (endpoint) db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?').run(req.dbUserId, endpoint)
  res.json({ success: true })
})

// POST /api/push/test — send a test notification
app.post('/api/push/test', requireAuth, asyncHandler(async (req, res) => {
  await sendPushToUser(req.dbUserId, '🔔 KINETIC', 'Push notifications פועלות! 💪', '/dashboard', 'test')
  res.json({ success: true })
}))

// Notification scheduler — runs every 30 minutes
setInterval(async () => {
  try {
    const hour = new Date().getHours()
    const users = db.prepare('SELECT id, user_id FROM users_auth').all()
    const today = new Date().toISOString().split('T')[0]

    for (const user of users) {
      const dbUserId = user.user_id ?? 1
      const stats = db.prepare('SELECT * FROM user_stats WHERE id = ?').get(dbUserId)
      if (!stats) continue

      // מים — כל 3 שעות אם מתחת ל-1,500ml (משתמשים ב-water_today מ-user_stats)
      const waterToday = stats.water_date === today ? (stats.water_today || 0) : 0
      const waterMl = Math.round(waterToday * 1000)
      if (hour % 3 === 0 && waterMl < 1500) {
        await sendPushToUser(
          user.id, '💧 שתית מספיק מים?',
          `שתית ${(waterMl / 1000).toFixed(1)}L היום — יעד: 2.5L`, '/dashboard', 'water'
        )
      }

      // streak בסכנה — ב-20:00 אם לא אימן היום
      if (hour === 20) {
        const lastSession = db.prepare('SELECT date FROM sessions WHERE user_id = ? ORDER BY date DESC LIMIT 1').get(dbUserId)
        if (lastSession && lastSession.date !== today && (stats.streak || 0) > 0) {
          await sendPushToUser(
            user.id, '🔥 הרצף שלך בסכנה!',
            `${stats.streak} ימי רצף — עוד 4 שעות להספיק אימון!`, '/workouts', 'streak'
          )
        }
      }

      // תוספים — ב-09:00
      if (hour === 9) {
        await sendPushToUser(
          user.id, '💊 זמן תוספים!',
          'קח את הקריאטין ואת הויטמינים שלך', '/supplements', 'supplements'
        )
      }

      // תזונה — ב-13:00 אם לא הוזנו קלוריות
      if (hour === 13) {
        const todayCalories = db.prepare(
          'SELECT COALESCE(SUM(calories), 0) as total FROM nutrition_logs WHERE date = ? AND user_id = ?'
        ).get(today, dbUserId)
        if ((todayCalories?.total || 0) < 300) {
          await sendPushToUser(
            user.id, '🍽️ לא שכחת לאכול?',
            'עדיין לא הוזנו ארוחות היום — בוא נעקוב!', '/nutrition', 'nutrition'
          )
        }
      }
    }
  } catch (err) {
    console.error('Notification scheduler error:', err.message)
  }
}, 30 * 60 * 1000)

// POST /api/users/onboarding
app.post('/api/users/onboarding', requireAuth, (req, res) => {
  // Skip mode — just mark onboarding done
  if (req.body.skip === true) {
    db.prepare('UPDATE user_stats SET onboarding_done = 1 WHERE id = ?').run(req.dbUserId)
    db.prepare('UPDATE users SET onboarded = 1 WHERE id = ?').run(req.dbUserId)
    return res.json({ success: true })
  }

  const {
    // New simplified flow fields
    goal, fitnessLevel, daysPerWeek,
    // Legacy fields (still accepted for backward compat)
    name, weight, height, goalDetail, activityLevel, gender, calorieTarget, proteinTarget,
    // Shared
    age,
  } = req.body

  const isNewFlow = !!fitnessLevel   // new 4-step onboarding
  const w = parseFloat(weight) || 80
  const h = parseFloat(height) || 175
  const a = parseInt(age) || 25
  const g = gender || 'male'

  // Activity multiplier
  const actMult = isNewFlow
    ? ({ beginner: 1.2, intermediate: 1.55, advanced: 1.725 }[fitnessLevel] || 1.375)
    : ({ low: 1.2, medium: 1.55, high: 1.725 }[activityLevel] || 1.55)

  // Mifflin-St Jeor BMR
  const bmr = g === 'female'
    ? Math.round(10 * w + 6.25 * h - 5 * a - 161)
    : Math.round(10 * w + 6.25 * h - 5 * a + 5)

  // Calorie goal adjustment
  const newFlowAdj = { lose_weight: -300, gain_muscle: 300, general_fitness: 0, health: 0 }
  const legacyAdjMap = { lose_fast: -500, lose_slow: -250, maintain: 0, gain_slow: 250, gain_fast: 500 }
  const legacyFallback = { lose: -300, maintain: 0, gain: 300 }
  const goalAdj = isNewFlow
    ? (newFlowAdj[goal] ?? 0)
    : (legacyAdjMap[goalDetail] ?? legacyFallback[goal] ?? 0)

  const calories = calorieTarget || Math.round(bmr * actMult) + goalAdj
  const isGain = isNewFlow
    ? goal === 'gain_muscle'
    : (goalDetail === 'gain_slow' || goalDetail === 'gain_fast' || goal === 'gain')
  const protein = proteinTarget || Math.round(w * (isGain ? 2.2 : 2.0))

  const trialDate = new Date(); trialDate.setDate(trialDate.getDate() + 14)
  const trialStr = trialDate.toISOString()

  db.prepare(`
    UPDATE user_stats SET
      name=?, current_weight=?, daily_calorie_target=?, daily_protein_target=?,
      onboarding_done=1, tier='premium', trial_ends_at=?, gender=?, age=?
    WHERE id=?
  `).run(name || 'Alex', w, calories, protein, trialStr, g, a, req.dbUserId)
  db.prepare('UPDATE users SET name=?, daily_calorie_target=?, daily_protein_target=?, onboarded=1 WHERE id=?')
    .run(name || 'Alex', calories, protein, req.dbUserId)

  // Save to user_profile (new simplified onboarding)
  if (isNewFlow) {
    const dpw = parseInt(daysPerWeek) || 3
    const profileExists = db.prepare('SELECT COUNT(*) as c FROM user_profile WHERE user_id = ?').get(req.dbUserId)
    if (profileExists.c === 0) {
      db.prepare('INSERT INTO user_profile (user_id, goal, fitness_level, days_per_week, age) VALUES (?, ?, ?, ?, ?)')
        .run(req.dbUserId, goal, fitnessLevel, dpw, a)
    } else {
      db.prepare('UPDATE user_profile SET goal=?, fitness_level=?, days_per_week=?, age=? WHERE user_id=?')
        .run(goal, fitnessLevel, dpw, a, req.dbUserId)
    }
  }

  res.json({ success: true, tier: 'premium', trialEndsAt: trialStr, calories, protein })
})

// PATCH /api/users/upgrade
app.patch('/api/users/upgrade', requireAuth, (req, res) => {
  const upgradeDate = new Date(); upgradeDate.setDate(upgradeDate.getDate() + 365)
  const d = upgradeDate.toISOString()
  db.prepare("UPDATE user_stats SET tier='premium', trial_ends_at=? WHERE id=?").run(d, req.dbUserId)
  db.prepare("UPDATE users SET tier='premium', is_pro=1 WHERE id=?").run(req.dbUserId)
  res.json({ success: true, trialEndsAt: d })
})

// ─── ANALYTICS ──────────────────────────────────────────────────────────────

// GET /api/analytics/compound
app.get('/api/analytics/compound', requireAuth, checkPremium, (req, res) => {
  const sets = db.prepare(`
    SELECT ws.exercise_name, ws.weight, ws.reps, ws.rpe, s.date
    FROM workout_sets ws
    JOIN sessions s ON ws.session_id = s.id
    WHERE ws.completed = 1 AND ws.user_id = ?
    ORDER BY s.date ASC, ws.id ASC
  `).all(req.dbUserId)

  // Volume per date → cumulative
  const byDate = {}
  sets.forEach(s => {
    if (!byDate[s.date]) byDate[s.date] = 0
    byDate[s.date] += (s.weight || 0) * (s.reps || 0)
  })
  let running = 0
  const cumulativeVolume = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vol]) => { running += vol; return { date, total: Math.round(running) } })

  // Weekly volume (week starting Monday)
  const weeklyByKey = {}
  sets.forEach(s => {
    const d = new Date(s.date)
    const dow = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
    const week = monday.toISOString().split('T')[0]
    if (!weeklyByKey[week]) weeklyByKey[week] = 0
    weeklyByKey[week] += (s.weight || 0) * (s.reps || 0)
  })
  const weeklyVolume = Object.entries(weeklyByKey)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, total]) => ({ week, total: Math.round(total) }))

  const totalLifted = Math.round(running)
  const avgWeekly = weeklyVolume.length > 0
    ? Math.round(weeklyVolume.reduce((s, w) => s + w.total, 0) / weeklyVolume.length)
    : 0
  const projectedMonthly = avgWeekly * 4

  // General stats
  const weekAgoDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const twoWeeksAgoDate = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0]

  const topEx = db.prepare(`
    SELECT ws.exercise_name, SUM(ws.weight * ws.reps) as vol
    FROM workout_sets ws WHERE ws.completed = 1 AND ws.user_id = ?
    GROUP BY ws.exercise_name ORDER BY vol DESC LIMIT 1
  `).get(req.dbUserId)

  const rpeRow = db.prepare(`
    SELECT AVG(ws.rpe) as avg_rpe FROM workout_sets ws
    JOIN sessions s ON ws.session_id = s.id
    WHERE ws.completed = 1 AND ws.user_id = ? AND s.date >= ?
  `).get(req.dbUserId, weekAgoDate)

  const setsThisWeek = db.prepare(`
    SELECT COUNT(*) as c FROM workout_sets ws
    JOIN sessions s ON ws.session_id = s.id
    WHERE ws.completed = 1 AND ws.user_id = ? AND s.date >= ?
  `).get(req.dbUserId, weekAgoDate)

  const setsPrevWeek = db.prepare(`
    SELECT COUNT(*) as c FROM workout_sets ws
    JOIN sessions s ON ws.session_id = s.id
    WHERE ws.completed = 1 AND ws.user_id = ? AND s.date >= ? AND s.date < ?
  `).get(req.dbUserId, twoWeeksAgoDate, weekAgoDate)

  // ─── Projection & Milestone ────────────────────────────────────────────────
  const weeksActive = weeklyVolume.length || 1
  const weeklyAvg = totalLifted / weeksActive
  const months3  = Math.round(totalLifted + weeklyAvg * 12)
  const months6  = Math.round(totalLifted + weeklyAvg * 26)
  const months12 = Math.round(totalLifted + weeklyAvg * 52)
  const pctIncrease = totalLifted > 0 ? Math.round(((months12 - totalLifted) / totalLifted) * 100) : 0

  // Milestone: next round thousand
  const milestones = [1000, 2500, 5000, 10000, 25000, 50000, 100000]
  const nextMilestone = milestones.find(m => m > totalLifted)
  let milestone = null
  if (nextMilestone && weeklyAvg > 0) {
    const kgLeft = nextMilestone - totalLifted
    const daysLeft = Math.round((kgLeft / weeklyAvg) * 7)
    const names = { 1000: 'טון אחד', 2500: '2.5 טון', 5000: '5 טון', 10000: '10 טון', 25000: '25 טון', 50000: '50 טון', 100000: '100 טון' }
    milestone = { name: names[nextMilestone] || `${(nextMilestone/1000).toFixed(0)} טון`, daysLeft, target: nextMilestone }
  }

  res.json({
    cumulativeVolume,
    weeklyVolume,
    totalLifted,
    projectedMonthly,
    projection: { months3, months6, months12, percentIncrease: pctIncrease },
    milestone,
    generalStats: {
      topExercise: topEx ? { name: topEx.exercise_name, volume: Math.round(topEx.vol) } : null,
      avgRpeThisWeek: rpeRow?.avg_rpe ? parseFloat(rpeRow.avg_rpe.toFixed(1)) : null,
      setsThisWeek: setsThisWeek?.c || 0,
      setsPrevWeek: setsPrevWeek?.c || 0,
    },
  })
})

// GET /api/analytics/plateaus
app.get('/api/analytics/plateaus', requireAuth, checkPremium, (req, res) => {
  const exercises = db.prepare(
    'SELECT DISTINCT exercise_name FROM workout_sets WHERE completed = 1 AND user_id = ?'
  ).all(req.dbUserId).map(r => r.exercise_name)

  const plateaus = []
  for (const exName of exercises) {
    const sessions = db.prepare(`
      SELECT s.date, MAX(ws.weight) as max_weight
      FROM workout_sets ws
      JOIN sessions s ON ws.session_id = s.id
      WHERE ws.exercise_name = ? AND ws.completed = 1 AND ws.user_id = ?
      GROUP BY s.date ORDER BY s.date DESC LIMIT 6
    `).all(exName, req.dbUserId)

    if (sessions.length < 3) continue

    const weights = sessions.map(s => s.max_weight)
    // Count consecutive sessions with no weight increase (most recent first)
    let sessionsStuck = 1
    for (let i = 0; i < weights.length - 1; i++) {
      if (weights[i] <= weights[i + 1]) sessionsStuck++
      else break
    }
    if (sessionsStuck < 3) continue

    plateaus.push({
      exercise: exName,
      currentWeight: weights[0],
      sessionsStuck,
      suggestion: sessionsStuck >= 5 ? 'שקול שבוע Deload' : 'נסה טווח 12-15 חזרות',
    })
  }

  res.json({ plateaus })
})

// GET /api/analytics/moving-average
app.get('/api/analytics/moving-average', requireAuth, checkPremium, (req, res) => {
  const exercises = db.prepare(
    'SELECT DISTINCT exercise_name FROM workout_sets WHERE completed = 1 AND user_id = ?'
  ).all(req.dbUserId).map(r => r.exercise_name)

  const result = {}
  for (const exName of exercises) {
    const sessions = db.prepare(`
      SELECT s.date, MAX(ws.weight) as weight
      FROM workout_sets ws
      JOIN sessions s ON ws.session_id = s.id
      WHERE ws.exercise_name = ? AND ws.completed = 1 AND ws.user_id = ?
      GROUP BY s.date ORDER BY s.date ASC
    `).all(exName, req.dbUserId)

    if (sessions.length < 2) continue

    result[exName] = sessions.map((s, i) => {
      let ma3
      if (i >= 2) ma3 = parseFloat(((sessions[i-2].weight + sessions[i-1].weight + s.weight) / 3).toFixed(1))
      else if (i >= 1) ma3 = parseFloat(((sessions[i-1].weight + s.weight) / 2).toFixed(1))
      else ma3 = parseFloat((s.weight || 0).toFixed(1))
      return { date: s.date, weight: s.weight, ma3 }
    })
  }

  res.json({ exercises: result })
})

// GET /api/analytics/workout-dna
app.get('/api/analytics/workout-dna', requireAuth, checkPremium, (req, res) => {
  const sessions = db.prepare(`
    SELECT s.id, s.date, s.duration, s.calories, s.volume,
           w.category, w.name AS workout_name, w.muscle_groups, w.id AS workout_id
    FROM sessions s
    LEFT JOIN workouts w ON s.workout_id = w.id
    WHERE s.date >= date('now', '-30 days') AND s.user_id = ?
    ORDER BY s.date ASC
  `).all(req.dbUserId)

  if (sessions.length === 0) {
    return res.json({ empty: true, message: 'אין מספיק נתונים — התחל להתאמן!' })
  }

  // ─── Type breakdown ───────────────────────────────────────────────────────
  const typeCounts = { STRENGTH: 0, HIIT: 0, CARDIO: 0, YOGA: 0, OTHER: 0 }
  sessions.forEach(s => {
    const cat = (s.category || 'OTHER').toUpperCase()
    typeCounts[cat in typeCounts ? cat : 'OTHER']++
  })
  const total = sessions.length
  const typeBreakdown = {}
  Object.entries(typeCounts).forEach(([k, v]) => {
    if (v > 0) typeBreakdown[k] = Math.round((v / total) * 100)
  })

  const dominantEntry = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]
  const dominantType = dominantEntry[0] // raw key: STRENGTH, HIIT, CARDIO, YOGA, OTHER

  // ─── Push/Pull balance ────────────────────────────────────────────────────
  const sets = db.prepare(`
    SELECT ws.exercise_name FROM workout_sets ws
    JOIN sessions s ON ws.session_id = s.id
    WHERE s.date >= date('now', '-30 days') AND ws.completed = 1 AND ws.user_id = ?
  `).all(req.dbUserId)

  const pushKeywords = ['לחיצה', 'push', 'bench', 'shoulder', 'כתפיים', 'chest', 'tricep', 'triceps', 'squat', 'כפיפה']
  const pullKeywords = ['שורה', 'pull', 'row', 'curl', 'גב', 'back', 'bicep', 'biceps', 'deadlift', 'מתח']
  let pushCount = 0, pullCount = 0
  sets.forEach(({ exercise_name: n }) => {
    const lower = n.toLowerCase()
    if (pushKeywords.some(k => lower.includes(k))) pushCount++
    else if (pullKeywords.some(k => lower.includes(k))) pullCount++
  })
  const pushPct = pushCount + pullCount > 0 ? Math.round(pushCount / (pushCount + pullCount) * 100) : 50
  const pullPct = 100 - pushPct
  const balanced = Math.abs(pushPct - pullPct) <= 20
  const ratioStr = balanced ? `${pushPct}:${pullPct} — מאוזן` : `${pushPct}:${pullPct} — לא מאוזן`

  // ─── Strengths & weaknesses ───────────────────────────────────────────────
  const strengths = [], weaknesses = []
  if (typeCounts.STRENGTH >= 3) strengths.push('Upper Body Strength')
  if (typeCounts.HIIT >= 3)     strengths.push('High Intensity Training')
  if (typeCounts.CARDIO >= 3)   strengths.push('Cardio Endurance')
  if (typeCounts.YOGA >= 2)     strengths.push('Mobility & Recovery')
  if (typeCounts.CARDIO < 2)    weaknesses.push('Cardio Endurance')
  if (typeCounts.YOGA < 1)      weaknesses.push('Mobility')
  if (!balanced)                weaknesses.push('Push/Pull Balance')
  if (typeCounts.STRENGTH < 2)  weaknesses.push('Strength Training')

  // ─── Consistency ─────────────────────────────────────────────────────────
  const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
  const dayCounts = [0, 0, 0, 0, 0, 0, 0]
  sessions.forEach(s => { if (s.date) dayCounts[new Date(s.date).getDay()]++ })
  const bestDayIdx = dayCounts.indexOf(Math.max(...dayCounts))
  const avgPerWeek = parseFloat((sessions.length / 4.3).toFixed(1))

  // Longest streak
  const dateSorted = [...new Set(sessions.map(s => s.date))].sort()
  let streak = 1, maxStreak = 1
  for (let i = 1; i < dateSorted.length; i++) {
    const diff = (new Date(dateSorted[i]) - new Date(dateSorted[i - 1])) / 86400000
    streak = diff === 1 ? streak + 1 : 1
    if (streak > maxStreak) maxStreak = streak
  }

  // ─── Recommendations ─────────────────────────────────────────────────────
  const recommendations = []
  const allWorkouts = db.prepare('SELECT id, name, category FROM workouts').all()

  if (weaknesses.includes('Cardio Endurance')) {
    const cardio = allWorkouts.find(w => w.category?.toUpperCase() === 'CARDIO')
    if (cardio) recommendations.push({ title: 'שפר Cardio', desc: 'הוסף ריצה של 20 דקות פעמיים בשבוע', workoutId: cardio.id })
  }
  if (weaknesses.includes('Mobility')) {
    const yoga = allWorkouts.find(w => w.category?.toUpperCase() === 'YOGA')
    if (yoga) recommendations.push({ title: 'שפר ניידות', desc: 'הוסף 10 דקות מתיחות לאחר כל אימון', workoutId: yoga.id })
  }
  if (weaknesses.includes('Push/Pull Balance')) {
    const pull = allWorkouts.find(w => (w.name || '').toLowerCase().includes('back') || (w.name || '').toLowerCase().includes('גב'))
    recommendations.push({ title: 'אזן Push/Pull', desc: 'הוסף שורות וסנטחות להשלים אחורי', workoutId: pull?.id || allWorkouts[0]?.id })
  }
  if (recommendations.length === 0) {
    recommendations.push({ title: 'המשך כך!', desc: `${avgPerWeek} אימונים לשבוע — מעולה. נסה להוסיף עוד אחד`, workoutId: allWorkouts[0]?.id })
  }

  res.json({
    dominantType,
    sessionCount: sessions.length,
    typeBreakdown,
    pushPullBalance: { push: pushPct, pull: pullPct, ratio: ratioStr, balanced },
    weaknesses: weaknesses.slice(0, 3),
    strengths: strengths.slice(0, 3),
    consistency: { avgPerWeek, bestDay: dayNames[bestDayIdx], longestStreak: maxStreak },
    recommendations: recommendations.slice(0, 3),
  })
})

// GET /api/analytics/war-room
app.get('/api/analytics/war-room', requireAuth, checkPremium, (req, res) => {
  const stats = db.prepare('SELECT * FROM user_stats WHERE id = ?').get(req.dbUserId)

  const now = new Date()
  const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - 7)
  const lastWeekStart = new Date(now); lastWeekStart.setDate(now.getDate() - 14)
  const twStart = thisWeekStart.toISOString().split('T')[0]
  const lwStart = lastWeekStart.toISOString().split('T')[0]
  const today   = now.toISOString().split('T')[0]

  // This week sessions
  const thisSessions = db.prepare(`
    SELECT s.id, s.date, s.calories, s.volume, w.name AS workout_name
    FROM sessions s LEFT JOIN workouts w ON s.workout_id = w.id
    WHERE s.date >= ? AND s.date <= ? AND s.user_id = ?
    ORDER BY s.date DESC
  `).all(twStart, today, req.dbUserId)

  // Last week sessions
  const lastSessions = db.prepare(`
    SELECT s.id, s.volume FROM sessions s
    WHERE s.date >= ? AND s.date < ? AND s.user_id = ?
  `).all(lwStart, twStart, req.dbUserId)

  const thisVolume = thisSessions.reduce((s, r) => s + (r.volume || 0), 0)
  const lastVolume = lastSessions.reduce((s, r) => s + (r.volume || 0), 0)

  const volumeChangePct = lastVolume > 0
    ? Math.round(((thisVolume - lastVolume) / lastVolume) * 100)
    : (thisVolume > 0 ? 100 : 0)

  // Best workout this week
  const bestWorkout = thisSessions.reduce((best, s) => (!best || (s.volume || 0) > (best.volume || 0)) ? s : best, null)

  // Nutrition this week
  const nutrRows = db.prepare(`
    SELECT date, SUM(calories) AS cal, SUM(protein) AS prot
    FROM nutrition_logs WHERE date >= ? AND date <= ? AND user_id = ?
    GROUP BY date
  `).all(twStart, today, req.dbUserId)

  const avgCalories = nutrRows.length > 0
    ? Math.round(nutrRows.reduce((s, r) => s + (r.cal || 0), 0) / nutrRows.length)
    : 0
  const avgProtein = nutrRows.length > 0
    ? Math.round(nutrRows.reduce((s, r) => s + (r.prot || 0), 0) / nutrRows.length)
    : 0

  // Week date range for display
  const weekLabel = `${twStart} — ${today}`

  // Score: workouts (40pts max), protein (30pts max), volume growth (20pts max), streak bonus (10pts)
  const proteinTarget = stats.daily_protein_target || 160
  const workoutsScore  = Math.min(thisSessions.length * 10, 40)
  const proteinScore   = avgProtein > 0 ? Math.min(Math.round((avgProtein / proteinTarget) * 30), 30) : 0
  const volumeScore    = volumeChangePct > 0 ? Math.min(Math.round(volumeChangePct / 5), 20) : 10
  const streakBonus    = (stats.streak || 0) >= 7 ? 10 : 0
  const score          = Math.min(workoutsScore + proteinScore + volumeScore + streakBonus, 100)

  // Insights
  const insights = []
  if (thisSessions.length >= 4) insights.push(`שבוע מצוין — ${thisSessions.length} אימונים!`)
  else if (thisSessions.length >= 2) insights.push(`${thisSessions.length} אימונים השבוע — יש עוד מקום לצמוח`)
  else insights.push('שבוע שקט — נסה לסגור לפחות 3 אימונים')

  if (avgProtein > 0 && avgProtein < proteinTarget * 0.8)
    insights.push('החלבון נמוך מהיעד — הוסף ארוחת חלבון אחת')
  else if (avgProtein >= proteinTarget)
    insights.push(`יעד החלבון הושג — ${avgProtein}g ממוצע יומי`)
  else
    insights.push(`ממוצע חלבון: ${avgProtein}g — קרוב ליעד!`)

  if ((stats.streak || 0) > 7) insights.push(`Streak של ${stats.streak} ימים — שמור על זה!`)
  if (volumeChangePct > 0) insights.push(`העלת נפח ב-${volumeChangePct}% לעומת השבוע שעבר`)
  if (insights.length < 3) insights.push('המשך להתמיד — עקביות היא המפתח')

  // Goals for next week
  const goals = []
  if (thisSessions.length < 4) goals.push(`${Math.max(thisSessions.length + 1, 3)} אימונים לשבוע הבא`)
  else goals.push('שמור על קצב של 4+ אימונים')
  if (avgProtein < proteinTarget) goals.push(`הגע ל-${proteinTarget}g חלבון יומי`)
  else goals.push('שמור על צריכת חלבון יומית')
  goals.push(volumeChangePct >= 0 ? 'הוסף 5% נפח על שבוע זה' : 'שחזר את הנפח של שבוע שעבר')

  res.json({
    week: {
      workouts: thisSessions.length,
      totalVolume: thisVolume,
      avgCalories,
      avgProtein,
      avgSleep: stats.sleep || '7h',
      bestWorkout: bestWorkout?.workout_name || null,
      streak: stats.streak || 0,
      weekLabel,
    },
    vsLastWeek: {
      workouts: thisSessions.length - lastSessions.length,
      volume: volumeChangePct,
      calories: 0,
    },
    insights: insights.slice(0, 3),
    goals: goals.slice(0, 3),
    score,
  })
})

// POST /api/sessions/start — create session at workout start, returns session_id
app.post('/api/sessions/start', requireAuth, (req, res) => {
  const { workoutId } = req.body
  const today = new Date().toISOString().split('T')[0]
  const result = db.prepare(
    'INSERT INTO sessions (workout_id, duration, calories, volume, date, user_id) VALUES (?, 0, 0, 0, ?, ?)'
  ).run(workoutId || null, today, req.dbUserId)
  res.json({ session_id: result.lastInsertRowid })
})

// PATCH /api/sessions/:id — update session totals at workout end
app.patch('/api/sessions/:id', requireAuth, (req, res) => {
  const { duration, calories, volume } = req.body
  db.prepare(
    'UPDATE sessions SET duration = ?, calories = ?, volume = ? WHERE id = ? AND user_id = ?'
  ).run(duration || 0, calories || 0, volume || 0, req.params.id, req.dbUserId)
  // Streak — once per day
  const today = new Date().toISOString().split('T')[0]
  const statsRow = db.prepare('SELECT streak_last_date FROM user_stats WHERE id = ?').get(req.dbUserId)
  if (statsRow && statsRow.streak_last_date !== today) {
    db.prepare('UPDATE user_stats SET streak = streak + 1, streak_last_date = ? WHERE id = ?').run(today, req.dbUserId)
  }
  res.json({ ok: true })
})

// GET /api/sets/last?exercise=name — last logged set for this exercise
app.get('/api/sets/last', requireAuth, (req, res) => {
  const { exercise } = req.query
  if (!exercise) return res.json(null)
  const row = db.prepare(
    'SELECT weight, reps, rpe, date FROM workout_sets WHERE exercise_name = ? AND completed = 1 AND user_id = ? ORDER BY date DESC, id DESC LIMIT 1'
  ).get(exercise, req.dbUserId)
  res.json(row || null)
})

// GET /api/sets/session/:session_id — all sets for a session
app.get('/api/sets/session/:session_id', requireAuth, (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM workout_sets WHERE session_id = ? ORDER BY exercise_name, set_number ASC'
  ).all(req.params.session_id)
  res.json(rows)
})

// POST /api/sets — save individual set
app.post('/api/sets', requireAuth, (req, res) => {
  const { session_id, exercise_name, set_number, weight, reps, rpe, is_ai_alternative } = req.body
  const today = new Date().toISOString().split('T')[0]
  const result = db.prepare(
    'INSERT INTO workout_sets (session_id, exercise_name, set_number, weight, reps, rpe, is_ai_alternative, completed, date, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)'
  ).run(session_id, exercise_name, set_number || 1, weight || 0, reps || 0, rpe || 7, is_ai_alternative ? 1 : 0, today, req.dbUserId)

  const prResult = weight > 0 && reps > 0
    ? checkAndUpdatePR(exercise_name, weight || 0, reps || 0, session_id)
    : { isPR: false }

  res.json({ id: result.lastInsertRowid, isPR: prResult.isPR, prDetails: prResult.isPR ? prResult : undefined })
})

// ─── EXERCISES / PR ─────────────────────────────────────────────────────────

// Internal PR check logic (reused by POST /api/sets)
function checkAndUpdatePR(exercise_name, weight, reps, session_id) {
  const existing = db.prepare('SELECT * FROM personal_records WHERE exercise_name = ?').get(exercise_name)
  if (!existing) {
    const date = new Date().toISOString().split('T')[0]
    db.prepare('INSERT INTO personal_records (exercise_name, weight, reps, date, session_id) VALUES (?, ?, ?, ?, ?)')
      .run(exercise_name, weight, reps, date, session_id)
    return { isPR: true, isFirst: true, weight, reps, exercise: exercise_name }
  }
  if (weight > existing.weight) {
    const date = new Date().toISOString().split('T')[0]
    const previous = { weight: existing.weight, reps: existing.reps, date: existing.date }
    db.prepare('UPDATE personal_records SET weight=?, reps=?, date=?, session_id=? WHERE exercise_name=?')
      .run(weight, reps, date, session_id, exercise_name)
    return { isPR: true, isFirst: false, weight, reps, exercise: exercise_name, previous }
  }
  return { isPR: false }
}

// GET /api/exercises/list
app.get('/api/exercises/list', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT exercise_name as name,
           COUNT(*) as totalSets,
           MAX(date) as lastDate
    FROM workout_sets
    WHERE user_id = ?
    GROUP BY exercise_name
    ORDER BY totalSets DESC
  `).all(req.dbUserId)
  res.json(rows)
})

// GET /api/exercises/history?exercise=...  [Pro]
app.get('/api/exercises/history', requireAuth, requirePro, (req, res) => {
  const { exercise } = req.query
  if (!exercise) return res.status(400).json({ error: 'missing exercise' })

  const rows = db.prepare(`
    SELECT ws.weight, ws.reps, ws.rpe, ws.date,
           (ws.weight * ws.reps) as volume
    FROM workout_sets ws
    WHERE ws.exercise_name = ? AND ws.user_id = ?
    ORDER BY ws.date ASC, ws.id ASC
  `).all(exercise, req.dbUserId)

  const pr = db.prepare('SELECT * FROM personal_records WHERE exercise_name = ?').get(exercise)
  const totalSets = rows.length
  const avgWeight = totalSets > 0
    ? Math.round((rows.reduce((s, r) => s + r.weight, 0) / totalSets) * 10) / 10
    : 0

  res.json({
    exercise,
    history: rows,
    pr: pr ? { weight: pr.weight, reps: pr.reps, date: pr.date } : null,
    totalSets,
    avgWeight,
  })
})

// GET /api/exercises/prs  [Pro]
app.get('/api/exercises/prs', requireAuth, requirePro, (req, res) => {
  const rows = db.prepare('SELECT * FROM personal_records ORDER BY date DESC').all()
  const today = new Date()
  const result = rows.map(r => ({
    exercise_name: r.exercise_name,
    weight: r.weight,
    reps: r.reps,
    date: r.date,
    daysAgo: Math.floor((today - new Date(r.date)) / 86400000),
  }))
  res.json(result)
})

// POST /api/exercises/check-pr
app.post('/api/exercises/check-pr', requireAuth, (req, res) => {
  const { exercise_name, weight, reps, session_id } = req.body
  res.json(checkAndUpdatePR(exercise_name, weight, reps, session_id))
})

// ─── REMINDERS ──────────────────────────────────────────────────────────────

// GET /api/reminders
// ─── WORKOUT PLANS ──────────────────────────────────────────────────────────

app.get('/api/plans', (req, res) => {
  const plans = db.prepare('SELECT * FROM workout_plans ORDER BY id').all()
  const days = db.prepare('SELECT * FROM plan_days ORDER BY day_number').all()
  res.json(plans.map(p => ({
    ...p,
    days: days.filter(d => d.plan_id === p.id).map(d => ({ id: d.id, day_number: d.day_number, name: d.name, muscle_groups: d.muscle_groups })),
  })))
})

app.get('/api/plans/:id', (req, res) => {
  const plan = db.prepare('SELECT * FROM workout_plans WHERE id = ?').get(req.params.id)
  if (!plan) return res.status(404).json({ error: 'not_found' })
  const days = db.prepare('SELECT * FROM plan_days WHERE plan_id = ? ORDER BY day_number').all(plan.id)
  const exercises = db.prepare('SELECT * FROM plan_day_exercises WHERE plan_day_id IN (' + days.map(() => '?').join(',') + ') ORDER BY id').all(...days.map(d => d.id))
  res.json({
    ...plan,
    days: days.map(d => ({
      ...d,
      exercises: exercises.filter(e => e.plan_day_id === d.id),
    })),
  })
})

app.post('/api/plans', requireAuth, (req, res) => {
  const { name, description, days } = req.body
  if (!name || !days?.length) return res.status(400).json({ error: 'missing_fields' })
  // Free users are limited to 3 custom plans
  if (!isUserPro(req.dbUserId)) {
    const { c } = db.prepare('SELECT COUNT(*) as c FROM workout_plans WHERE is_custom = 1').get()
    if (c >= 3) {
      return res.status(403).json({ error: 'premium_required', message: 'מגבלת 3 תוכניות אימון — שדרג ל-Pro לתוכניות בלתי מוגבלות' })
    }
  }
  const { lastInsertRowid: planId } = db.prepare('INSERT INTO workout_plans (name, description, is_custom) VALUES (?, ?, 1)').run(name, description || '')
  const insertDay = db.prepare('INSERT INTO plan_days (plan_id, day_number, name, muscle_groups) VALUES (?, ?, ?, ?)')
  const insertEx  = db.prepare('INSERT INTO plan_day_exercises (plan_day_id, exercise_name, sets, reps) VALUES (?, ?, ?, ?)')
  days.forEach((day, idx) => {
    const { lastInsertRowid: dayId } = insertDay.run(planId, idx + 1, day.name, day.muscle_groups || '')
    ;(day.exercises || []).forEach(ex => insertEx.run(dayId, ex.name, ex.sets || 3, ex.reps || '8-12'))
  })
  res.json({ id: planId })
})

app.delete('/api/plans/:id', requireAuth, (req, res) => {
  const plan = db.prepare('SELECT * FROM workout_plans WHERE id = ?').get(req.params.id)
  if (!plan) return res.status(404).json({ error: 'not_found' })
  if (!plan.is_custom) return res.status(403).json({ error: 'cannot_delete_builtin' })
  const days = db.prepare('SELECT id FROM plan_days WHERE plan_id = ?').all(req.params.id)
  days.forEach(d => db.prepare('DELETE FROM plan_day_exercises WHERE plan_day_id = ?').run(d.id))
  db.prepare('DELETE FROM plan_days WHERE plan_id = ?').run(req.params.id)
  db.prepare('DELETE FROM workout_plans WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

app.get('/api/reminders', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM reminders').all()
  res.json(rows)
})

// PATCH /api/reminders/:id
app.patch('/api/reminders/:id', requireAuth, (req, res) => {
  const { hour, minute, enabled } = req.body
  const { id } = req.params
  const fields = []
  const vals = []
  if (hour !== undefined)    { fields.push('hour = ?');    vals.push(hour) }
  if (minute !== undefined)  { fields.push('minute = ?');  vals.push(minute) }
  if (enabled !== undefined) { fields.push('enabled = ?'); vals.push(enabled ? 1 : 0) }
  if (!fields.length) return res.json({ ok: true })
  vals.push(id)
  db.prepare(`UPDATE reminders SET ${fields.join(', ')} WHERE id = ?`).run(...vals)
  res.json({ ok: true })
})

// GET /api/reminders/status
app.get('/api/reminders/status', requireAuth, (req, res) => {
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()
  const currentHour = now.getHours()

  const workoutDone = !!db.prepare('SELECT id FROM sessions WHERE date = ? AND user_id = ?').get(today, req.dbUserId)

  const supps = db.prepare('SELECT * FROM supplements').all()
  const supplementsTaken = supps.length > 0 && supps.every(s => s.last_taken === today)

  const streakAtRisk = !workoutDone && currentHour >= 18

  const endOfDay = new Date(); endOfDay.setHours(23, 59, 0, 0)
  const hoursLeftToSave = Math.max(0, Math.round((endOfDay - now) / 3600000))

  const stats = db.prepare('SELECT streak FROM user_stats WHERE id = ?').get(req.dbUserId)
  const currentStreak = stats?.streak || 0

  res.json({ workoutDone, supplementsTaken, streakAtRisk, hoursLeftToSave, currentStreak })
})

// GET /api/reminders/streak-check
app.get('/api/reminders/streak-check', requireAuth, (req, res) => {
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()
  const currentHour = now.getHours()

  const workoutDone = !!db.prepare('SELECT id FROM sessions WHERE date = ? AND user_id = ?').get(today, req.dbUserId)
  const streakAtRisk = !workoutDone && currentHour >= 18

  const endOfDay = new Date(); endOfDay.setHours(23, 59, 0, 0)
  const hoursLeftToSave = Math.max(0, Math.round((endOfDay - now) / 3600000))

  const stats = db.prepare('SELECT streak FROM user_stats WHERE id = ?').get(req.dbUserId)
  const currentStreak = stats?.streak || 0

  const quickWorkout = db.prepare('SELECT * FROM workouts ORDER BY duration ASC LIMIT 1').get()

  res.json({ streakAtRisk, hoursLeftToSave, currentStreak, quickWorkout })
})

// ─── DAILY CHALLENGE ────────────────────────────────────────────────────────
const EASY_CHALLENGES = [
  { text: 'שתה כוס מים עכשיו 💧', type: 'hydration', xp: 10 },
  { text: 'עשה 10 push-ups עכשיו 💪', type: 'mini_workout', xp: 20 },
  { text: 'צא להליכה של 10 דקות 🚶', type: 'cardio', xp: 25 },
  { text: 'אכול ירק אחד היום 🥦', type: 'nutrition', xp: 15 },
  { text: 'תפוס שינה של לפחות 7 שעות הלילה 😴', type: 'sleep', xp: 30 },
  { text: 'עשה סט אחד של 20 squats 🦵', type: 'mini_workout', xp: 20 },
  { text: 'שתה 500ml מים לפני הצהריים 💧', type: 'hydration', xp: 15 },
  { text: 'אכול ארוחת בוקר עם חלבון 🥚', type: 'nutrition', xp: 20 },
  { text: 'עשה 30 שניות planks ⏱️', type: 'mini_workout', xp: 25 },
  { text: 'קח תוסף אחד שפספסת 💊', type: 'supplement', xp: 10 },
]

// ─── EXERCISE IMAGE PROXY (wger.de) ─────────────────────────────────────────
const WGER_IDS = {
  'Bench Press': 192,
  'Squat': 193,
  'Deadlift': 241,
  'Pull-ups': 194,
  'Shoulder Press': 196,
  'Overhead Press': 196,
  'Barbell Row': 197,
  'Lateral Raises': 198,
  'Bicep Curl': 199,
  'Dumbbell Curl': 199,
  'Tricep Pushdown': 200,
  'Leg Press': 201,
  'Romanian Deadlift': 202,
  'Dips': 203,
  'Tricep Dips': 203,
  'Plank': 204,
  'Burpees': 205,
  'Lunges': 206,
}

const wgerImageCache = {}

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'kinetic-app/1.0' } }, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch (e) { reject(e) }
      })
    }).on('error', reject)
  })
}

app.get('/api/exercises/gif/:exerciseName', asyncHandler(async (req, res) => {
  const name = decodeURIComponent(req.params.exerciseName)
  const wgerId = WGER_IDS[name]
  if (!wgerId) return res.status(404).json({ error: 'not_found' })

  if (wgerImageCache[wgerId]) {
    return res.redirect(302, wgerImageCache[wgerId])
  }

  const data = await httpsGetJson(
    `https://wger.de/api/v2/exerciseimage/?exercise_base=${wgerId}&format=json`
  )
  const imageUrl = data.results?.[0]?.image
  if (!imageUrl) return res.status(404).json({ error: 'no_image' })

  wgerImageCache[wgerId] = imageUrl
  res.redirect(302, imageUrl)
}))

app.get('/api/daily-challenge', requireAuth, (req, res) => {
  const dayIndex = Math.floor(Date.now() / 86400000) % EASY_CHALLENGES.length
  const challenge = EASY_CHALLENGES[dayIndex]
  const today = new Date().toISOString().split('T')[0]
  const stats = db.prepare('SELECT challenge_done_date FROM user_stats WHERE id = ?').get(req.dbUserId)
  res.json({ challenge, xp: challenge.xp, done: stats?.challenge_done_date === today })
})

app.post('/api/daily-challenge/complete', requireAuth, (req, res) => {
  const today = new Date().toISOString().split('T')[0]
  db.prepare('UPDATE user_stats SET challenge_done_date = ? WHERE id = ?').run(today, req.dbUserId)
  res.json({ ok: true })
})

// ─── STRIPE PAYMENTS ──────────────────────────────────────────────────────────
app.post('/api/payments/create-checkout-session', requireAuth, asyncHandler(async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe not configured' })
  }
  const Stripe = require('stripe')
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY)

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'ils',
        recurring: { interval: 'month' },
        product_data: { name: 'KINETIC Pro' },
        unit_amount: 4900,
      },
      quantity: 1,
    }],
    subscription_data: {
      trial_period_days: 14,
    },
    metadata: { userId: String(req.dbUserId) },
    success_url: 'https://kinetic-app-lovat.vercel.app/dashboard?payment=success',
    cancel_url: 'https://kinetic-app-lovat.vercel.app/pricing',
  })

  res.json({ url: session.url })
}))

// ─── GLOBAL ERROR + 404 HANDLERS ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'not_found' })
})

const EXERCISE_DB_MAP = {
  'Bench Press': 'barbell bench press',
  'Squat': 'barbell squat',
  'Deadlift': 'deadlift',
  'Pull-ups': 'pull-up',
  'Shoulder Press': 'barbell overhead press',
  'Barbell Row': 'barbell bent over row',
  'Lateral Raises': 'dumbbell lateral raise',
  'Bicep Curl': 'dumbbell biceps curl',
  'Dumbbell Curl': 'dumbbell biceps curl',
  'Tricep Pushdown': 'cable pushdown',
  'Leg Press': 'leg press',
  'Romanian Deadlift': 'romanian deadlift',
  'Dips': 'chest dip',
  'Tricep Dips': 'chest dip',
  'Plank': 'plank',
  'Lunges': 'dumbbell lunge',
  'Leg Curl': 'leg curl',
  'Calf Raises': 'calf raise',
  'Hammer Curl': 'dumbbell hammer curl',
  'Skull Crushers': 'ez barbell skull crusher',
  'Incline DB Press': 'dumbbell incline bench press',
  'Cable Row': 'cable seated row',
  'Cable Fly': 'cable fly',
  'Burpees': 'burpee',
  'Push-ups': 'push-up',
  'Lat Pulldown': 'cable lat pulldown',
  'Overhead Press': 'barbell overhead press',
}

const gifCache = {}

app.get('/api/exercises/demo/:exerciseName', asyncHandler(async (req, res) => {
  const name = decodeURIComponent(req.params.exerciseName)
  const query = EXERCISE_DB_MAP[name]

  if (!query) return res.json({ gifUrl: null })
  if (gifCache[name]) return res.json({ gifUrl: gifCache[name] })

  try {
    const response = await fetch(
      `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(query)}?limit=1`,
      {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
          'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
        },
      }
    )
    const data = await response.json()
    const gifUrl = data?.[0]?.gifUrl || null
    if (gifUrl) gifCache[name] = gifUrl
    res.json({ gifUrl })
  } catch (e) {
    res.json({ gifUrl: null })
  }
}))

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${err.stack || err.message}`)
  res.status(500).json({ error: 'server_error', message: err.message })
})

// ─── Daily Email Scheduler ────────────────────────────────────────────────────
// Runs at 09:00 every day.
// Day-3 reminder: registered 3 days ago, never logged back in after registration
// Day-7 Pro offer: registered 7 days ago and still on free tier
cron.schedule('0 9 * * *', async () => {
  console.log('[Cron] Running daily email checks...')
  try {
    const todayISO = new Date().toISOString().split('T')[0]

    // Calculate cutoff dates
    const d3 = new Date(); d3.setDate(d3.getDate() - 3)
    const d7 = new Date(); d7.setDate(d7.getDate() - 7)
    const day3Date = d3.toISOString().split('T')[0]
    const day7Date = d7.toISOString().split('T')[0]

    // ── Day-3 reminder: no login after registration ──────────────────────────
    const day3Users = db.prepare(`
      SELECT id, email, name FROM users_auth
      WHERE date(created_at) = ?
        AND email_day3_sent = 0
        AND (last_login_at IS NULL OR last_login_at <= created_at)
    `).all(day3Date)

    for (const u of day3Users) {
      await sendReminderEmail(u.email, u.name || u.email.split('@')[0])
      db.prepare('UPDATE users_auth SET email_day3_sent = 1 WHERE id = ?').run(u.id)
      console.log(`[Cron] Day-3 reminder sent → ${u.email}`)
    }

    // ── Day-7 Pro offer: free-tier users ────────────────────────────────────
    const day7Users = db.prepare(`
      SELECT ua.id, ua.email, ua.name, ua.user_id FROM users_auth ua
      WHERE date(ua.created_at) = ?
        AND ua.email_day7_sent = 0
    `).all(day7Date)

    for (const u of day7Users) {
      const dbUserId = u.user_id ?? 1
      const tier = db.prepare('SELECT tier FROM user_stats WHERE id = ?').get(dbUserId)
      if (!tier || tier.tier !== 'premium') {
        await sendProOfferEmail(u.email, u.name || u.email.split('@')[0])
        db.prepare('UPDATE users_auth SET email_day7_sent = 1 WHERE id = ?').run(u.id)
        console.log(`[Cron] Day-7 Pro offer sent → ${u.email}`)
      }
    }

    console.log(`[Cron] Email checks done. day3=${day3Users.length} day7 checked.`)
  } catch (err) {
    console.error('[Cron] Email scheduler error:', err.message)
  }
}, { timezone: 'Asia/Jerusalem' })

// הרצת המיגרציה אוטומטית בסטארטאפ
try {
  db.prepare('ALTER TABLE nutrition_logs ADD COLUMN user_id INTEGER').run()
  console.log('✅ Migration: user_id added to nutrition_logs')
} catch (e) {
  // אם העמודה כבר קיימת, ממשיך הלאה בלי לקרוס
}

const PORT = process.env.PORT
if (!PORT) throw new Error('PORT environment variable is required')
app.listen(PORT, '0.0.0.0', () => {
  console.log(`KINETIC server running on port ${PORT}`)
})
