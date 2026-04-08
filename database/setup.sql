-- ════════════════════════════════════════════════════════════════
--  PrepPath — Supabase Database Setup
--  Run this entire file in: Supabase → SQL Editor → New Query → Run
-- ════════════════════════════════════════════════════════════════

CREATE EXTENSION
IF NOT EXISTS pgcrypto;


-- ────────────────────────────────────────────────
--  1. PROGRESS TABLE
--  Stores all checkbox/toggle state for one user
-- ────────────────────────────────────────────────
CREATE TABLE
IF NOT EXISTS progress
(
  user_id    TEXT PRIMARY KEY,
  state_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now
(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now
()
);

-- Legacy schema compatibility:
-- if progress already exists with older columns, add the fields expected by the API.
ALTER TABLE progress ADD COLUMN
IF NOT EXISTS user_id TEXT;
ALTER TABLE progress ADD COLUMN
IF NOT EXISTS state_data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE progress ADD COLUMN
IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now
();
ALTER TABLE progress ADD COLUMN
IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now
();

-- Backfill missing/empty user ids to keep rows valid and unique.
UPDATE progress
SET user_id = 'legacy_' || substr(md5(ctid::text), 1, 12)
WHERE user_id IS NULL OR btrim(user_id) = '';

-- Ensure upsert ON CONFLICT (user_id) works even for legacy tables.
CREATE UNIQUE INDEX
IF NOT EXISTS idx_progress_user_id_unique ON progress
(user_id);

-- Index for fast lookup
CREATE INDEX
IF NOT EXISTS idx_progress_updated ON progress
(updated_at DESC);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at
()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now
();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_progress_updated
ON progress;
CREATE TRIGGER trg_progress_updated
  BEFORE
UPDATE ON progress
  FOR EACH ROW
EXECUTE FUNCTION update_updated_at
();

-- Row Level Security (each user sees only their own data)
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

DROP POLICY
IF EXISTS "progress_self" ON progress;
CREATE POLICY "progress_self" ON progress
  FOR ALL USING
(user_id = current_setting
('request.jwt.claims', true)::jsonb->>'sub'
              OR user_id = auth.uid
()::text
              OR true);
-- allow anonymous for now; tighten after adding auth


-- ────────────────────────────────────────────────
--  2. CUSTOM TASKS TABLE
--  User-added tasks inside each project card
-- ────────────────────────────────────────────────
CREATE TABLE
IF NOT EXISTS custom_tasks
(
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
  user_id     TEXT NOT NULL,
  project_id  TEXT NOT NULL,            -- e.g. 'proj_personal', 'proj_recruiter'
  label       TEXT NOT NULL,
  difficulty  TEXT NOT NULL DEFAULT 'easy' CHECK
(difficulty IN
('easy','medium','hard')),
  done        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now
(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now
()
);

CREATE INDEX
IF NOT EXISTS idx_custom_tasks_user     ON custom_tasks
(user_id);
CREATE INDEX
IF NOT EXISTS idx_custom_tasks_project  ON custom_tasks
(project_id);
CREATE INDEX
IF NOT EXISTS idx_custom_tasks_created  ON custom_tasks
(created_at ASC);

DROP TRIGGER IF EXISTS trg_custom_tasks_updated
ON custom_tasks;
CREATE TRIGGER trg_custom_tasks_updated
  BEFORE
UPDATE ON custom_tasks
  FOR EACH ROW
EXECUTE FUNCTION update_updated_at
();

ALTER TABLE custom_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY
IF EXISTS "tasks_self" ON custom_tasks;
CREATE POLICY "tasks_self" ON custom_tasks
  FOR ALL USING
(true);
-- tighten after adding auth


-- ────────────────────────────────────────────────
--  3. JOURNAL TABLE
--  Evening reflection entries, one per day
-- ────────────────────────────────────────────────
CREATE TABLE
IF NOT EXISTS journal
(
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
  user_id          TEXT NOT NULL,
  entry_date       DATE NOT NULL,
  learnt           TEXT,           -- "3 things I learnt today"
  confused         TEXT,           -- "1 thing I was confused about"
  gratitude        TEXT,           -- gratitude note
  verse_reflection TEXT,           -- faith/scripture reflection
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now
(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now
(),
  UNIQUE
(user_id, entry_date)     -- one entry per user per day
);

CREATE INDEX
IF NOT EXISTS idx_journal_user_date ON journal
(user_id, entry_date DESC);

DROP TRIGGER IF EXISTS trg_journal_updated
ON journal;
CREATE TRIGGER trg_journal_updated
  BEFORE
UPDATE ON journal
  FOR EACH ROW
EXECUTE FUNCTION update_updated_at
();

ALTER TABLE journal ENABLE ROW LEVEL SECURITY;
DROP POLICY
IF EXISTS "journal_self" ON journal;
CREATE POLICY "journal_self" ON journal
  FOR ALL USING
(true);


-- ────────────────────────────────────────────────
--  4. STUDY SESSIONS TABLE (optional, for future)
--  Track how long you study each topic
-- ────────────────────────────────────────────────
CREATE TABLE
IF NOT EXISTS study_sessions
(
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid
(),
  user_id     TEXT NOT NULL,
  topic       TEXT NOT NULL,    -- e.g. 'csharp', 'aptitude', 'dsa', 'cloud'
  duration_min INT NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now
()
);

CREATE INDEX
IF NOT EXISTS idx_sessions_user_date ON study_sessions
(user_id, session_date DESC);
CREATE INDEX
IF NOT EXISTS idx_sessions_topic     ON study_sessions
(topic);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY
IF EXISTS "sessions_self" ON study_sessions;
CREATE POLICY "sessions_self" ON study_sessions
  FOR ALL USING
(true);


-- ────────────────────────────────────────────────
--  5. SEED — default user record so app works
--  immediately without auth setup
-- ────────────────────────────────────────────────
DO $$
DECLARE
  id_required_no_default BOOLEAN := false;
  id_udt_name TEXT := NULL;
BEGIN
  SELECT
    (is_nullable = 'NO'
  AND column_default IS NULL),
    udt_name
  INTO id_required_no_default, id_udt_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'progress'
    AND column_name = 'id';

  IF id_required_no_default THEN
  IF id_udt_name = 'uuid' THEN
  INSERT INTO progress
    (id, user_id, state_data)
  VALUES
    (gen_random_uuid(), 'user_main', '{}'
  ::jsonb)
      ON CONFLICT
  (user_id) DO NOTHING;
ELSIF id_udt_name IN
('text', 'varchar', 'bpchar') THEN
INSERT INTO progress
  (id, user_id, state_data)
VALUES
  ('seed_user_main', 'user_main', '{}'
::jsonb)
      ON CONFLICT
(user_id) DO NOTHING;
    ELSE
      RAISE EXCEPTION 'progress.id has unsupported NOT NULL type % without default. Add a default or make it nullable.', id_udt_name;
END
IF;
  ELSE
    INSERT INTO progress
  (user_id, state_data)
VALUES
  ('user_main', '{}'
::jsonb)
    ON CONFLICT
(user_id) DO NOTHING;
END
IF;
END $$;


-- ────────────────────────────────────────────────
--  6. USEFUL VIEWS
-- ────────────────────────────────────────────────

-- Daily completion summary
CREATE OR REPLACE VIEW daily_summary AS
SELECT
  user_id,
  entry_date,
  learnt
IS NOT NULL AND learnt != '' AS has_learnt,
  gratitude IS NOT NULL AND gratitude != '' AS has_gratitude,
  verse_reflection IS NOT NULL AND verse_reflection != '' AS has_verse
FROM journal;

-- Study streak view (how many consecutive days journalled)
CREATE OR REPLACE VIEW journal_streak AS
SELECT
  user_id,
  COUNT(DISTINCT entry_date) AS total_days,
  MAX(entry_date) AS last_entry
FROM journal
GROUP BY user_id;


-- ────────────────────────────────────────────────
--  DONE ✓
--  Your database is ready.
--  Copy your Project URL and anon key from:
--  Supabase → Settings → API
--  Paste them in the app's ⚙ Sync Setup tab.
-- ────────────────────────────────────────────────
