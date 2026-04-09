-- ════════════════════════════════════════════════════════════════════════════
-- PREPPATH - SUPABASE DATABASE SCHEMA
-- Run this SQL in your Supabase project → SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Create the progress/state table
-- Stores user's overall progress and app state
CREATE TABLE IF NOT EXISTS progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. Create the tasks table
-- Stores user's custom tasks across projects
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id TEXT,
  label TEXT NOT NULL,
  difficulty TEXT DEFAULT 'easy',
  done BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 3. Create the journal table
-- Stores user's journal entries with mood and reflections
CREATE TABLE IF NOT EXISTS journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT,
  mood TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- ════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) - Users can only see their own data
-- ════════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal ENABLE ROW LEVEL SECURITY;

-- Progress policies
CREATE POLICY progress_select_policy ON progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY progress_insert_policy ON progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY progress_update_policy ON progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY progress_delete_policy ON progress
  FOR DELETE USING (auth.uid() = user_id);

-- Tasks policies
CREATE POLICY tasks_select_policy ON tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY tasks_insert_policy ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY tasks_update_policy ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY tasks_delete_policy ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Journal policies
CREATE POLICY journal_select_policy ON journal
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY journal_insert_policy ON journal
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY journal_update_policy ON journal
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY journal_delete_policy ON journal
  FOR DELETE USING (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════════════
-- ENABLE REALTIME (for live subscriptions)
-- ════════════════════════════════════════════════════════════════════════════

-- In Supabase Dashboard, go to:
-- 1. Settings → Realtime → Database
-- 2. Toggle ON for: public.progress, public.tasks, public.journal
-- 3. Apply changes

-- Alternatively, use this SQL to enable realtime:
BEGIN;
  -- For Supabase it's done via Dashboard, but we can manage publications if needed
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
  ALTER PUBLICATION supabase_realtime ADD TABLE progress;
  ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
  ALTER PUBLICATION supabase_realtime ADD TABLE journal;
COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- BONUS: Indexes for performance
-- ════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks(done);
CREATE INDEX IF NOT EXISTS idx_journal_user_id ON journal(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_created_at ON journal(created_at DESC);

-- ════════════════════════════════════════════════════════════════════════════
-- TESTING: Insert some sample data
-- ════════════════════════════════════════════════════════════════════════════

-- To test, first create a test user via Supabase Auth
-- Then uncomment and update the UUID below:

/*
INSERT INTO progress (user_id, state_data) VALUES
  ('YOUR-USER-ID-HERE', '{"ringPct": 45, "tracks": {"NET": 5, "DSA": 3}}')
ON CONFLICT (user_id) DO UPDATE SET state_data = excluded.state_data;

INSERT INTO tasks (user_id, project_id, label, difficulty, done) VALUES
  ('YOUR-USER-ID-HERE', 'project_1', 'Learn TypeScript basics', 'easy', false),
  ('YOUR-USER-ID-HERE', 'project_1', 'Build a REST API', 'medium', false),
  ('YOUR-USER-ID-HERE', 'project_2', 'Study React hooks', 'medium', true);

INSERT INTO journal (user_id, title, content, mood) VALUES
  ('YOUR-USER-ID-HERE', 'Progress Update', 'Had a productive day learning React', 'positive');
*/

-- ════════════════════════════════════════════════════════════════════════════
-- QUICK START CHECKLIST
-- ════════════════════════════════════════════════════════════════════════════

/*
✅ Steps to complete real-time sync setup in Supabase:

1. [] Go to your Supabase project dashboard
2. [] Click SQL Editor → New Query
3. [] Copy all the SQL above and run it (this creates tables, RLS, indexes)
4. [] Go to Settings → Realtime → Database
5. [] Toggle ON for: progress, tasks, journal tables
6. [] Click "Apply changes" (may take 30 seconds)

7. [] Update frontend/config.js:
     - SUPABASE_URL: Get from Settings → API → Project URL
     - SUPABASE_ANON_KEY: Get from Settings → API → anon public key

8. [] Deploy frontend (or run locally)
9. [] Test:
     - Go to https://yourapp.com
     - Click "Login for Sync"
     - Enter your email and open the magic link (in your email)
     - You're now logged in across devices!

10. [] Open the app on 2 devices (desktop + mobile, or 2 browsers)
11. [] Add a task on Device A → See it appear on Device B in real-time ✨
12. [] Toggle a task done on Device B → See the change on Device A instantly!

That's it! Cross-device real-time sync is now active.
*/
