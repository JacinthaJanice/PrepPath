// REALTIME SYNC INTEGRATION GUIDE
// Use this file to understand how to wire real-time subscriptions into pwa-ui.js

/*
╔════════════════════════════════════════════════════════════════════════════╗
║                 HOW TO USE REALTIME-SYNC.JS IN YOUR APP                   ║
╚════════════════════════════════════════════════════════════════════════════╝

STEP 1: Include the scripts in index.html (in order):
  1. config.js
  2. realtime-sync.js
  3. auth-ui.js
  4. pwa-ui.js (your existing app)

STEP 2: Initialize Auth UI in your index.html body:
  <div id="auth-header"></div>
  <script>
    AuthUI.mount('#auth-header');
    SYNC.verifyMagicLink(); // Auto-login if redirected from email
  </script>

STEP 3: Wire real-time subscriptions into your app logic
*/

// ════════════════════════════════════════════════════════════════════════════
// EXAMPLE 1: Subscribe to Task Changes (Real-Time)
// ════════════════════════════════════════════════════════════════════════════

async function setupTaskSync() {
    const user = SYNC.getCurrentUser();
    if (!user) {
        console.log('Not logged in yet');
        return;
    }

    // Subscribe to task changes
    await SYNC.subscribeToTasks(user.id, (payload) => {
        console.log('📡 Task update received:', payload);

        if (payload.eventType === 'INSERT') {
            // New task was added on another device
            const newTask = payload.new;
            console.log(`✨ New task added: "${newTask.label}"`);
            // TODO: Update your UI to show the new task
            // UIstate.tasks.push(newTask);
            // renderTasks();
        } else if (payload.eventType === 'UPDATE') {
            // Task was modified on another device
            const updatedTask = payload.new;
            console.log(`✏️ Task updated: "${updatedTask.label}" (done: ${updatedTask.done})`);
            // TODO: Update your UI to reflect changes
        } else if (payload.eventType === 'DELETE') {
            // Task was deleted on another device
            const deletedTask = payload.old;
            console.log(`🗑️ Task deleted: "${deletedTask.label}"`);
            // TODO: Remove task from UI
        }
    });
}

// ════════════════════════════════════════════════════════════════════════════
// EXAMPLE 2: Subscribe to Journal Changes (Real-Time)
// ════════════════════════════════════════════════════════════════════════════

async function setupJournalSync() {
    const user = SYNC.getCurrentUser();
    if (!user) return;

    await SYNC.subscribeToJournal(user.id, (payload) => {
        console.log('📡 Journal update received:', payload);

        if (payload.eventType === 'INSERT') {
            const newEntry = payload.new;
            console.log(`📝 New journal entry: ${newEntry.title}`);
            // TODO: Update journal UI
        }
    });
}

// ════════════════════════════════════════════════════════════════════════════
// EXAMPLE 3: Subscribe to Progress/State Changes (Real-Time)
// ════════════════════════════════════════════════════════════════════════════

async function setupProgressSync() {
    const user = SYNC.getCurrentUser();
    if (!user) return;

    await SYNC.subscribeToProgress(user.id, (payload) => {
        console.log('📡 Progress update received:', payload);

        // Merge remote state with local state
        if (payload.eventType === 'UPDATE') {
            const remoteState = payload.new.state_data;
            // TODO: Merge with local state and re-render
            console.log('🔄 Syncing progress state:', remoteState);
        }
    });
}

// ════════════════════════════════════════════════════════════════════════════
// EXAMPLE 4: Add a Task via Sync (Write to Supabase)
// ════════════════════════════════════════════════════════════════════════════

async function addTaskViaSync(projectId, label, difficulty = 'easy') {
    const user = SYNC.getCurrentUser();
    if (!user) throw new Error('Not logged in');

    try {
        const task = await SYNC.insertData('tasks', user.id, {
            project_id: projectId,
            label,
            difficulty,
            done: false,
            created_at: new Date().toISOString()
        });

        console.log('✨ Task added to Supabase:', task);
        // Other devices will receive real-time update via subscription
        return task;
    } catch (error) {
        console.error('Failed to add task:', error);
        throw error;
    }
}

// ════════════════════════════════════════════════════════════════════════════
// EXAMPLE 5: Update a Task via Sync
// ════════════════════════════════════════════════════════════════════════════

async function toggleTaskViaSync(taskId, done) {
    const user = SYNC.getCurrentUser();
    if (!user) throw new Error('Not logged in');

    try {
        const updated = await SYNC.updateData('tasks', taskId, { done });
        console.log('✓ Task toggled:', updated);
        // Other devices will receive real-time update via subscription
        return updated;
    } catch (error) {
        console.error('Failed to toggle task:', error);
        throw error;
    }
}

// ════════════════════════════════════════════════════════════════════════════
// EXAMPLE 6: Delete a Task via Sync
// ════════════════════════════════════════════════════════════════════════════

async function deleteTaskViaSync(taskId) {
    const user = SYNC.getCurrentUser();
    if (!user) throw new Error('Not logged in');

    try {
        const success = await SYNC.deleteData('tasks', taskId);
        console.log('✓ Task deleted');
        // Other devices will receive real-time update via subscription
        return success;
    } catch (error) {
        console.error('Failed to delete task:', error);
        throw error;
    }
}

// ════════════════════════════════════════════════════════════════════════════
// EXAMPLE 7: Initialize ALL Syncs on App Start
// ════════════════════════════════════════════════════════════════════════════

async function initializeAllSync() {
    try {
        // Verify if user is already logged in
        const user = await SYNC.verifyMagicLink();

        if (user) {
            console.log('✓ User is logged in:', user.email);

            // Setup all subscriptions
            await setupTaskSync();
            await setupJournalSync();
            await setupProgressSync();

            console.log('✓ Real-time sync initialized');
        } else {
            console.log('ℹ Not logged in. App will work offline.');
            console.log('Users can click "Login for Sync" when ready.');
        }
    } catch (error) {
        console.error('Sync initialization error:', error);
    }
}

// ════════════════════════════════════════════════════════════════════════════
// EXAMPLE 8: Hybrid Mode - Fallback to localStorage if not logged in
// ════════════════════════════════════════════════════════════════════════════

class TaskManager {
    constructor() {
        this.tasks = [];
    }

    async add(projectId, label, difficulty = 'easy') {
        const user = SYNC.getCurrentUser();

        if (user) {
            // Logged in: save to Supabase
            return await addTaskViaSync(projectId, label, difficulty);
        } else {
            // Offline: save to localStorage
            const task = {
                id: Date.now().toString(),
                project_id: projectId,
                label,
                difficulty,
                done: false,
                created_at: new Date().toISOString()
            };
            this.tasks.push(task);
            this.saveToLocalStorage();
            return task;
        }
    }

    async toggle(taskId, done) {
        const user = SYNC.getCurrentUser();

        if (user) {
            return await toggleTaskViaSync(taskId, done);
        } else {
            const task = this.tasks.find(t => t.id === taskId);
            if (task) task.done = done;
            this.saveToLocalStorage();
            return task;
        }
    }

    async delete(taskId) {
        const user = SYNC.getCurrentUser();

        if (user) {
            return await deleteTaskViaSync(taskId);
        } else {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveToLocalStorage();
            return true;
        }
    }

    saveToLocalStorage() {
        localStorage.setItem('pp3_tasks_cache', JSON.stringify(this.tasks));
    }

    loadFromLocalStorage() {
        const cached = localStorage.getItem('pp3_tasks_cache');
        if (cached) this.tasks = JSON.parse(cached);
    }
}

// Usage:
// const taskMgr = new TaskManager();
// await taskMgr.add('project_1', 'Learn React', 'medium');

// ════════════════════════════════════════════════════════════════════════════
// EXAMPLE 9: Database Schema (SQL to run in Supabase)
// ════════════════════════════════════════════════════════════════════════════

/*
Run this SQL in Supabase → SQL Editor to create the tables:

-- Auth is handled by Supabase Auth (auth.users)

-- Progress/State
CREATE TABLE IF NOT EXISTS progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state_data JSONB DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id)
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id TEXT,
  label TEXT NOT NULL,
  difficulty TEXT,
  done BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Journal
CREATE TABLE IF NOT EXISTS journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT,
  mood TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own data
CREATE POLICY progress_user_policy ON progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY tasks_user_policy ON tasks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY journal_user_policy ON journal
  FOR ALL USING (auth.uid() = user_id);

-- Enable Realtime for these tables (Settings → Realtime)
-- In Supabase Dashboard:
-- 1. Go to Settings → Realtime
-- 2. Toggle ON for: progress, tasks, journal
*/

// ════════════════════════════════════════════════════════════════════════════
// Quick Start Check List
// ════════════════════════════════════════════════════════════════════════════

/*
□ 1. Update index.html to include all 4 JS files (config, realtime-sync, auth-ui, pwa-ui)
□ 2. Add <div id="auth-header"></div> and call AuthUI.mount('#auth-header')
□ 3. Run the SQL schema above in Supabase
□ 4. Enable Realtime for progress, tasks, and journal tables
□ 5. Call initializeAllSync() when your app starts
□ 6. Replace your existing task/journal operations with sync-aware versions
□ 7. Test on one device - add a task
□ 8. Open the app on another device (logged in with same email)
□ 9. Confirm the task appears instantly (real-time sync working!)
□ 10. Try syncing a journal entry or progress state

That's it! You now have cross-device real-time sync enabled.
*/
