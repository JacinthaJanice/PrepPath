-- ════════════════════════════════════════════════════════════════════════════
-- PREPPATH - SUPABASE DATABASE SCHEMA
-- This is the canonical schema file. Run this SQL in your Supabase project
-- via: Supabase Dashboard → SQL Editor → New Query → paste → Run
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Create the progress/state table
-- Stores user's overall progress and app state as a JSONB blob
CREATE TABLE IF NOT EXISTS progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. Create the custom_tasks table
-- Stores user-added tasks inside each project card
CREATE TABLE IF NOT EXISTS custom_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  label TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create the journal table
-- Stores evening reflection entries — one row per user per day
CREATE TABLE IF NOT EXISTS journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  learnt TEXT,
  confused TEXT,
  gratitude TEXT,
  verse_reflection TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, entry_date)
);

-- 4. Study sessions table (optional, for future time-tracking feature)
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  duration_min INT NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ════════════════════════════════════════════════════════════════════════════
-- AUTO-UPDATE TIMESTAMPS
-- ════════════════════════════════════════════════════════════════════════════

-- update_updated_at: automatically sets updated_at to the current timestamp
-- whenever a row is modified. Attached as a BEFORE UPDATE trigger on each table.
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_progress_updated ON progress;
CREATE TRIGGER trg_progress_updated
  BEFORE UPDATE ON progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_custom_tasks_updated ON custom_tasks;
CREATE TRIGGER trg_custom_tasks_updated
  BEFORE UPDATE ON custom_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_journal_updated ON journal;
CREATE TRIGGER trg_journal_updated
  BEFORE UPDATE ON journal
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) - Users can only see their own data
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- Progress policies
CREATE POLICY progress_select ON progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY progress_insert ON progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY progress_update ON progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY progress_delete ON progress FOR DELETE USING (auth.uid() = user_id);

-- Custom tasks policies
CREATE POLICY custom_tasks_select ON custom_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY custom_tasks_insert ON custom_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY custom_tasks_update ON custom_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY custom_tasks_delete ON custom_tasks FOR DELETE USING (auth.uid() = user_id);

-- Journal policies
CREATE POLICY journal_select ON journal FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY journal_insert ON journal FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY journal_update ON journal FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY journal_delete ON journal FOR DELETE USING (auth.uid() = user_id);

-- Study sessions policies
CREATE POLICY sessions_select ON study_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY sessions_insert ON study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY sessions_delete ON study_sessions FOR DELETE USING (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════════════
-- INDEXES FOR PERFORMANCE
-- ════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_progress_user_id     ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_tasks_user_id ON custom_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_tasks_project ON custom_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_custom_tasks_done    ON custom_tasks(done);
CREATE INDEX IF NOT EXISTS idx_custom_tasks_created ON custom_tasks(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_journal_user_date    ON journal(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_date   ON study_sessions(user_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_topic       ON study_sessions(topic);

-- ════════════════════════════════════════════════════════════════════════════
-- ENABLE REALTIME SUBSCRIPTIONS
-- In Supabase Dashboard → Settings → Realtime → Database
-- Toggle ON for: progress, custom_tasks, journal
-- Or run the SQL below:
-- ════════════════════════════════════════════════════════════════════════════

-- ALTER PUBLICATION supabase_realtime ADD TABLE progress;
-- ALTER PUBLICATION supabase_realtime ADD TABLE custom_tasks;
-- ALTER PUBLICATION supabase_realtime ADD TABLE journal;

-- ════════════════════════════════════════════════════════════════════════════
-- USEFUL VIEWS
-- ════════════════════════════════════════════════════════════════════════════

-- daily_summary: shows which journal fields (learnt, gratitude, verse_reflection)
-- have been filled in for each user/day combination. Useful for habit tracking UI.
CREATE OR REPLACE VIEW daily_summary AS
SELECT
  user_id,
  entry_date,
  learnt IS NOT NULL AND learnt != '' AS has_learnt,
  gratitude IS NOT NULL AND gratitude != '' AS has_gratitude,
  verse_reflection IS NOT NULL AND verse_reflection != '' AS has_verse
FROM journal;

-- journal_streak: returns total journalled days and the last entry date per user.
-- Note: counts all distinct days journalled, not necessarily consecutive days.
CREATE OR REPLACE VIEW journal_streak AS
SELECT
  user_id,
  COUNT(DISTINCT entry_date) AS total_days,
  MAX(entry_date) AS last_entry
FROM journal
GROUP BY user_id;

