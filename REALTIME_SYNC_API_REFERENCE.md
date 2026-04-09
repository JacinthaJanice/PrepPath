# PrepPath Real-Time Sync - Quick Reference

## 🎯 API Overview

### Authentication
```javascript
// Sign up / Log in with email
await SYNC.signUpWithEmail('user@example.com');
// Check inbox for magic link - click it to log in

// Check if already logged in (e.g., after redirect)
const user = await SYNC.verifyMagicLink();

// Get current user
const user = SYNC.getCurrentUser();  // { id, email, ... }

// Logout
await SYNC.logOut();
```

### Real-Time Subscriptions
```javascript
const user = SYNC.getCurrentUser();

// Subscribe to task changes
await SYNC.subscribeToTasks(user.id, (payload) => {
  console.log('Task changed:', payload);
  // payload.eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  // payload.new: the new/updated record
  // payload.old: the old record (for deletes)
});

// Subscribe to journal changes
await SYNC.subscribeToJournal(user.id, (payload) => {
  // Same as above
});

// Subscribe to progress/state changes
await SYNC.subscribeToProgress(user.id, (payload) => {
  // Same as above
});

// Stop listening to all subscriptions
SYNC.unsubscribeAll();
```

### Read/Write Data
```javascript
const user = SYNC.getCurrentUser();

// Get all records for a table
const tasks = await SYNC.getData('tasks', user.id);
const journal = await SYNC.getData('journal', user.id);
const progress = await SYNC.getData('progress', user.id);

// Insert (auto-broadcasts to other devices)
const newTask = await SYNC.insertData('tasks', user.id, {
  project_id: 'p_1',
  label: 'Learn React',
  difficulty: 'medium',
  done: false
});

// Update (auto-broadcasts)
const updated = await SYNC.updateData('tasks', taskId, {
  done: true,
  difficulty: 'hard'
});

// Delete (auto-broadcasts)
const deleted = await SYNC.deleteData('tasks', taskId);
```

### Sync Status
```javascript
// Get current sync status
const status = SYNC.getSyncStatus();
// Returns: 'connected' | 'syncing' | 'error' | 'disconnected'

// Listen to sync status changes
SYNC.onSyncStatusChange((status) => {
  console.log('Sync status:', status);
});
```

### Auth UI
```javascript
// Mount the authentication header UI
AuthUI.mount('#my-auth-container');

// This renders:
// - Sync status indicator (🟢 🟡 🔴 ⚪)
// - Login/logout buttons
// - Magic link login modal
```

---

## 📝 Common Patterns

### Pattern 1: Add Task with Real-Time Sync
```javascript
async function addNewTask(projectId, label, difficulty) {
  const user = SYNC.getCurrentUser();
  if (!user) throw new Error('User not logged in');

  const task = await SYNC.insertData('tasks', user.id, {
    project_id: projectId,
    label,
    difficulty,
    done: false,
    created_at: new Date().toISOString()
  });

  console.log('✓ Task added and will sync to all devices');
  return task;
}
```

### Pattern 2: Listen to Task Updates
```javascript
async function setupTaskListener() {
  const user = SYNC.getCurrentUser();
  if (!user) return;

  await SYNC.subscribeToTasks(user.id, (payload) => {
    if (payload.eventType === 'INSERT') {
      console.log('New task:', payload.new.label);
      // TODO: Add to UI
    }
    if (payload.eventType === 'UPDATE') {
      console.log('Task updated:', payload.new);
      // TODO: Update UI
    }
    if (payload.eventType === 'DELETE') {
      console.log('Task deleted:', payload.old.id);
      // TODO: Remove from UI
    }
  });
}
```

### Pattern 3: Hybrid Offline/Online
```javascript
class DataManager {
  async addTask(projectId, label, difficulty) {
    const user = SYNC.getCurrentUser();

    if (user) {
      // Online: use real-time sync
      return await SYNC.insertData('tasks', user.id, {
        project_id: projectId,
        label,
        difficulty,
        done: false
      });
    } else {
      // Offline: use localStorage (falls back to API.js)
      return await API.addTask(projectId, label, difficulty);
    }
  }
}
```

### Pattern 4: Get All Tasks
```javascript
async function getAllTasks() {
  const user = SYNC.getCurrentUser();
  if (!user) {
    // Not logged in - could use localStorage
    return [];
  }

  const tasks = await SYNC.getData('tasks', user.id);
  return tasks;
}
```

### Pattern 5: Toggle Task
```javascript
async function toggleTask(taskId, done) {
  const user = SYNC.getCurrentUser();
  if (!user) throw new Error('User not logged in');

  const updated = await SYNC.updateData('tasks', taskId, { done });
  
  // Change broadcasts to all devices automatically
  return updated;
}
```

---

## 🗂️ Database Schema

### Tasks Table
```sql
id (UUID) - primary key
user_id (UUID) - who owns this
project_id (string) - project reference
label (string) - task name
difficulty (string) - 'easy', 'medium', 'hard'
done (boolean) - completion status
created_at (timestamp)
updated_at (timestamp)
```

### Journal Table
```sql
id (UUID)
user_id (UUID)
title (string)
content (text)
mood (string)
created_at (timestamp)
updated_at (timestamp)
```

### Progress Table
```sql
id (UUID)
user_id (UUID)
state_data (JSONB) - arbitrary JSON state
created_at (timestamp)
updated_at (timestamp)
```

---

## 🔌 Hooks & Events

### On User Login
```javascript
// Manually trigger when user logs in (e.g., after email click)
const user = await SYNC.verifyMagicLink();
if (user) {
  console.log('User logged in:', user.email);
  // Setup subscriptions here
}
```

### On Sync Status Change
```javascript
SYNC.onSyncStatusChange((status) => {
  if (status === 'connected') console.log('✓ Synced');
  if (status === 'syncing') console.log('⏳ Syncing...');
  if (status === 'error') console.log('✗ Sync error');
  if (status === 'disconnected') console.log('⚪ Offline');
});
```

---

## ⚠️ Error Handling

```javascript
try {
  const task = await SYNC.insertData('tasks', user.id, {
    label: 'New task'
  });
} catch (error) {
  console.error('Failed to add task:', error.message);
  // Fallback to localStorage if network error
}
```

---

## 📌 Important Notes

1. **First time:** User must sign up with email (can't skip)
2. **After login:** User ID is available via `SYNC.getCurrentUser().id`
3. **Subscriptions:** Must call `.subscribeToX()` to get real-time updates
4. **Unsubscribe:** Call `SYNC.unsubscribeAll()` on logout or destroy
5. **Offline:** All methods fallback gracefully (no errors thrown)

---

## 🚀 Initialization

```javascript
// On app start:

// 1. Try to verify magic link (if user was redirected from email)
const user = await SYNC.verifyMagicLink();

// 2. Mount auth UI
AuthUI.mount('#auth-header');

// 3. If logged in, setup subscriptions
if (user) {
  await setupTaskListener();
  await setupJournalListener();
  // ...
}
```

---

## 📊 Example: Complete Integration

```html
<div id="auth-header"></div>
<div id="task-list"></div>

<script src="config.js"></script>
<script src="realtime-sync.js"></script>
<script src="auth-ui.js"></script>

<script>
  let tasks = [];

  async function init() {
    // Mount auth UI
    AuthUI.mount('#auth-header');

    // Check if already logged in
    const user = await SYNC.verifyMagicLink();
    if (!user) return;

    // Load initial tasks
    tasks = await SYNC.getData('tasks', user.id);
    renderTasks();

    // Subscribe to changes
    await SYNC.subscribeToTasks(user.id, (payload) => {
      if (payload.eventType === 'INSERT') {
        tasks.push(payload.new);
      } else if (payload.eventType === 'DELETE') {
        tasks = tasks.filter(t => t.id !== payload.old.id);
      } else if (payload.eventType === 'UPDATE') {
        const idx = tasks.findIndex(t => t.id === payload.new.id);
        if (idx >= 0) tasks[idx] = payload.new;
      }
      renderTasks();
    });
  }

  function renderTasks() {
    const html = tasks.map(t => `
      <div onclick="toggleTask('${t.id}', ${!t.done})">
        <input type="checkbox" ${t.done ? 'checked' : ''} />
        ${t.label}
      </div>
    `).join('');
    document.getElementById('task-list').innerHTML = html;
  }

  async function toggleTask(id, done) {
    const user = SYNC.getCurrentUser();
    await SYNC.updateData('tasks', id, { done });
    // UI updates automatically via subscription
  }

  init();
</script>
```

---

## 🎓 Learn More

- See `REALTIME_SYNC_GUIDE.js` for code examples
- See `database/supabase-schema.sql` for database setup
- See `PREPPATH_REALTIME_SYNC_SETUP.md` for full guide

