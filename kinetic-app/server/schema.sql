-- KINETIC — PostgreSQL Schema
-- Run once against a fresh database: psql $DATABASE_URL -f schema.sql

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  clerk_id    TEXT        UNIQUE,          -- NULL until Clerk auth is active
  name        TEXT        NOT NULL DEFAULT 'Alex',
  tier        TEXT        NOT NULL DEFAULT 'premium' CHECK (tier IN ('free','premium')),
  premium_trial_ends_at  TIMESTAMPTZ,
  daily_calorie_target   INTEGER NOT NULL DEFAULT 2500,
  daily_protein_target   INTEGER NOT NULL DEFAULT 160,
  daily_water_target     NUMERIC(4,2) NOT NULL DEFAULT 2.5,
  onboarded   INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workouts (
  id            SERIAL PRIMARY KEY,
  name          TEXT    NOT NULL,
  category      TEXT    NOT NULL,
  level         TEXT    NOT NULL,
  duration      INTEGER NOT NULL,
  description   TEXT    NOT NULL DEFAULT '',
  muscle_groups TEXT    NOT NULL DEFAULT '',
  muscle_group  TEXT    NOT NULL DEFAULT 'full_body',
  exercises     JSONB   NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS sessions (
  id          SERIAL PRIMARY KEY,
  workout_id  INTEGER     REFERENCES workouts(id) ON DELETE SET NULL,
  duration    INTEGER     NOT NULL DEFAULT 0,
  calories    INTEGER     NOT NULL DEFAULT 0,
  volume      INTEGER     NOT NULL DEFAULT 0,
  date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);

CREATE TABLE IF NOT EXISTS workout_sets (
  id                SERIAL PRIMARY KEY,
  session_id        INTEGER     REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_name     TEXT        NOT NULL,
  weight            NUMERIC(6,2) NOT NULL DEFAULT 0,
  reps              INTEGER     NOT NULL DEFAULT 0,
  rpe               INTEGER     NOT NULL DEFAULT 7 CHECK (rpe BETWEEN 1 AND 10),
  is_ai_alternative BOOLEAN     NOT NULL DEFAULT FALSE,
  set_number        INTEGER     NOT NULL DEFAULT 1,
  completed         BOOLEAN     NOT NULL DEFAULT TRUE,
  date              DATE        NOT NULL DEFAULT CURRENT_DATE
);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_sets(exercise_name);
CREATE INDEX IF NOT EXISTS idx_workout_sets_session  ON workout_sets(session_id);

CREATE TABLE IF NOT EXISTS user_stats (
  id                   INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  steps                INTEGER     NOT NULL DEFAULT 8432,
  step_goal            INTEGER     NOT NULL DEFAULT 10000,
  streak               INTEGER     NOT NULL DEFAULT 0,
  streak_last_date     DATE,
  resting_hr           INTEGER     NOT NULL DEFAULT 62,
  sleep                TEXT        NOT NULL DEFAULT '7h 20m',
  hydration            NUMERIC(4,2) NOT NULL DEFAULT 1.8,
  active_minutes       INTEGER     NOT NULL DEFAULT 54,
  current_weight       NUMERIC(5,2) NOT NULL DEFAULT 78.5,
  body_fat             NUMERIC(4,2) NOT NULL DEFAULT 14.2,
  tier                 TEXT        NOT NULL DEFAULT 'premium' CHECK (tier IN ('free','premium')),
  trial_ends_at        TIMESTAMPTZ,
  name                 TEXT        NOT NULL DEFAULT 'Alex',
  daily_calorie_target INTEGER     NOT NULL DEFAULT 2500,
  daily_protein_target INTEGER     NOT NULL DEFAULT 160,
  onboarding_done      INTEGER     NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS weight_logs (
  id         SERIAL PRIMARY KEY,
  weight     NUMERIC(5,2) NOT NULL,
  date       DATE         NOT NULL UNIQUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nutrition_logs (
  id           SERIAL PRIMARY KEY,
  date         DATE         NOT NULL DEFAULT CURRENT_DATE,
  meal_name    TEXT         NOT NULL,
  calories     INTEGER      NOT NULL DEFAULT 0,
  protein      NUMERIC(6,2) NOT NULL DEFAULT 0,
  carbs        NUMERIC(6,2) NOT NULL DEFAULT 0,
  fat          NUMERIC(6,2) NOT NULL DEFAULT 0,
  entry_method TEXT         NOT NULL DEFAULT 'manual',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_date ON nutrition_logs(date);

CREATE TABLE IF NOT EXISTS supplements (
  id                 SERIAL PRIMARY KEY,
  name               TEXT         NOT NULL,
  servings_remaining NUMERIC(6,2) NOT NULL DEFAULT 0,
  servings_total     NUMERIC(6,2) NOT NULL DEFAULT 0,
  cost_per_serving   NUMERIC(6,2) NOT NULL DEFAULT 0,
  current_streak     INTEGER      NOT NULL DEFAULT 0,
  last_taken         DATE
);

CREATE TABLE IF NOT EXISTS daily_readiness (
  id                    SERIAL PRIMARY KEY,
  date                  DATE    NOT NULL UNIQUE,
  sleep_hours           NUMERIC(4,2) NOT NULL DEFAULT 7,
  subjective_score      INTEGER NOT NULL DEFAULT 7 CHECK (subjective_score BETWEEN 1 AND 10),
  system_readiness_score INTEGER NOT NULL DEFAULT 70,
  notes                 TEXT    NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS reminders (
  id        SERIAL PRIMARY KEY,
  type      TEXT    NOT NULL,
  hour      INTEGER NOT NULL DEFAULT 8  CHECK (hour BETWEEN 0 AND 23),
  minute    INTEGER NOT NULL DEFAULT 0  CHECK (minute BETWEEN 0 AND 59),
  enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  last_sent TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS personal_records (
  id            SERIAL PRIMARY KEY,
  exercise_name TEXT         NOT NULL UNIQUE,
  weight        NUMERIC(6,2) NOT NULL,
  reps          INTEGER      NOT NULL,
  date          DATE         NOT NULL,
  session_id    INTEGER      REFERENCES sessions(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
