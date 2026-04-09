# 🔄 PrepPath Real-Time Sync Setup Guide

Enable cross-device synchronization for PrepPath using Supabase. Once set up, changes on one device appear instantly on another.

---

## 📋 What You'll Get

✅ **Cross-Device Sync** — Update a task on your phone, see it on your laptop instantly  
✅ **Real-Time Updates** — No refresh needed; changes broadcast live via WebSocket  
✅ **Authentication** — Magic link login (no passwords)  
✅ **Offline Support** — App works offline; syncs when back online  
✅ **Row-Level Security** — Users can only see their own data (encrypted in Supabase)  

---

## 🚀 Quick Start (5 mins)

### Step 1: Supabase Database Setup (2 mins)

1. Go to your [Supabase project](https://app.supabase.com)
2. Click **SQL Editor** → **New Query**
3. Copy all SQL from → `database/supabase-schema.sql`
4. Paste and run (watch the output for any errors)
5. Go to **Settings → Realtime** → Toggle ON for: `progress`, `tasks`, `journal`

✅ Database is ready.

---

### Step 2: Configure Frontend (1 min)

Your `frontend/config.js` already has Supabase credentials. Verify:

```javascript
window.PP_CONFIG = {
  SUPABASE_URL: 'https://ydmmcxemzxxifpvdwgsw.supabase.co',  // ← Verify this
  SUPABASE_ANON_KEY: 'sb_publishable_...',                   // ← Verify this
  // ... other config
};
```

If these are empty or wrong:
- Go to Supabase → **Settings → API**
- Copy **Project URL** → `SUPABASE_URL`
- Copy **public (anon) key** → `SUPABASE_ANON_KEY`
- Update `config.js` and save

✅ Frontend is configured.

---

### Step 3: Test Sync (2 mins)

1. Open PrepPath in your browser: `http://localhost:3000` (or deployed URL)
2. You'll see a **"Login for Sync"** button in the top-right
3. Click it → Enter your email → Check inbox for magic link
4. Click the magic link → You're logged in!
5. Sync indicator shows **🟢 Synced**

Now open PrepPath on another device (or different browser):
- Log in with the same email
- Add a task on Device A
- Watch it appear on Device B instantly ✨

---

## 📁 New Files Added

```
frontend/
  ├─ realtime-sync.js           # Core sync engine (handles subscriptions)
  ├─ auth-ui.js                 # Login/logout UI + sync status
  ├─ REALTIME_SYNC_GUIDE.js     # Code examples & integration guide
  └─ index.html                 # Updated with sync UI & scripts

database/
  └─ supabase-schema.sql        # Database schema (create tables & RLS)

PREPPATH_REALTIME_SYNC_SETUP.md # This file
```

---

## 🔧 Integration with Existing Code

The new sync modules are **non-breaking** — your app works exactly as before offline.

### Current State:
- Tasks/journal saved to **localStorage** (local device only)
- If backend URL is set, also tries to sync (but not real-time)

### With Real-Time Sync Enabled:
- If logged in → All changes go to **Supabase** + broadcast to other devices
- If not logged in → Fallback to **localStorage** (same as before)

### How to Use in Your Code:

**Example: Add a task with real-time sync**

```javascript
// Before (localStorage only):
await API.addTask(projectId, label, difficulty);

// After (with sync):
// Option 1: Use the sync layer (if logged in)
const user = SYNC.getCurrentUser();
if (user) {
  await SYNC.insertData('tasks', user.id, {
    project_id: projectId,
    label,
    difficulty,
    done: false
  });
} else {
  // Fallback to localStorage
  await API.addTask(projectId, label, difficulty);
}

// Or use a wrapper (see TaskManager example in REALTIME_SYNC_GUIDE.js)
```

---

## 🎯 Real-World Workflow

### Device A (Desktop):
1. Open PrepPath, log in with `user@example.com`
2. Add task: "Learn TypeScript"
3. Task appears locally and syncs to Supabase

### Device B (Mobile):
1. Open PrepPath, log in with `user@example.com`
2. See "Learn TypeScript" appear **instantly** via real-time subscription
3. Mark it done
4. Device A receives the update in real-time

### Offline Mode:
1. Device A goes offline
2. Add task: "Study algorithms"
3. Task saved to localStorage
4. Device A comes back online
5. Task syncs to Supabase
6. Device B receives update

---

## 📊 Architecture

```
┌─────────────────────────────────────────┐
│          PrepPath Devices               │
│  (Desktop, Mobile, Tablet, etc.)        │
└──────────────┬──────────────────────────┘
               │
               │ WebSocket (Real-Time)
               │ HTTP (One-time reads/writes)
               ↓
┌─────────────────────────────────────────┐
│       Supabase (Cloud Backend)          │
│  ├─ Auth (Email/Magic Link)             │
│  ├─ Database (Postgres)                 │
│  │  ├─ progress (per-user state)       │
│  │  ├─ tasks (per-user tasks)          │
│  │  └─ journal (per-user entries)      │
│  └─ Realtime (PostgreSQL Subscriptions) │
└─────────────────────────────────────────┘
```

**Data Flow:**
1. User logs in → Supabase Auth creates session
2. Changes made → sent to Supabase DB + all other logged-in devices
3. Devices receive changes via Realtime subscription
4. UI updates instantly without page refresh

---

## 🔐 Security

All user data is **encrypted in Supabase** and protected via:

- **Row-Level Security (RLS):** Each user can only access their own data
- **JWT Token:** Secure authentication token in localStorage
- **HTTPS:** All communication encrypted in transit
- **Session Timeout:** Auto-logout after inactivity (configurable)

---

## 🧪 Testing Checklist

- [ ] Database schema created (no SQL errors)
- [ ] Supabase Realtime enabled for 3 tables
- [ ] `config.js` has correct SUPABASE_URL and SUPABASE_ANON_KEY
- [ ] Frontend loads with Auth UI visible in header
- [ ] Can login with email magic link
- [ ] Sync status shows "🟢 Synced" when logged in
- [ ] Add a task on Device A
- [ ] Task appears on Device B within 1 second
- [ ] Toggle task done on Device B
- [ ] Toggle reflects on Device A instantly
- [ ] Logout works
- [ ] App works offline (localStorage fallback)

---

## 🐛 Troubleshooting

### Q: "Supabase credentials missing" error
**A:** Update `frontend/config.js` with your Supabase URL and anon key.

### Q: Magic link not arriving
**A:** Check spam folder. Or wait 2-3 mins. If still nothing:
- Verify email is correct
- Check Supabase → Auth → Users to see if signup worked
- Try different email

### Q: Changes not syncing between devices
**A:** 
1. Confirm both devices logged in (🟢 badge visible)
2. Check Supabase Dashboard → Realtime is enabled for tables
3. Open DevTools Console → look for errors
4. Try refreshing page

### Q: "Not allowed by CORS" error
**A:** Backend is rejecting your frontend origin. Update backend/.env:
```
ALLOWED_ORIGINS=http://localhost:3000,https://preppath.example.com
```

### Q: Real-time updates are slow
**A:** 
1. WebSocket connection takes time on first load
2. Try refreshing after 5 seconds
3. Check browser DevTools → Network → look for WebSocket (should be "101 Switching Protocols")

---

## 📚 Code Examples

See `frontend/REALTIME_SYNC_GUIDE.js` for:
- ✏️ Subscribe to task changes
- ✏️ Subscribe to journal changes
- ✏️ Subscribe to progress changes
- ✏️ Add/update/delete tasks via sync
- ✏️ Implement hybrid offline/online mode
- ✏️ Complete database schema

---

## 🔄 Next Steps

1. **Replace API layer** (optional):
   - Currently: `API.addTask()` → localStorage + fallback to backend
   - Future: `SYNC.insertData('tasks', ...)` → Supabase + real-time
   
   See `TaskManager` example in `REALTIME_SYNC_GUIDE.js` for a hybrid approach.

2. **Add more features**:
   - Push notifications when data changes
   - Conflict resolution (if edits happen simultaneously)
   - Share tasks with other users (invite flow)

3. **Deploy**:
   - Frontend: Vercel, Netlify, or your hosting
   - Backend: Keep Express running or migrate to Supabase Functions
   - Database: Already hosted on Supabase ✅

---

## 📞 Support

- **Supabase Docs:** https://supabase.com/docs
- **Realtime Guide:** https://supabase.com/docs/guides/realtime
- **JavaScript Client:** https://supabase.com/docs/reference/javascript/v2

---

## ✨ Summary

You now have:
- ✅ Authenticated users (magic link login)
- ✅ Cloud database (Supabase Postgres)
- ✅ Real-time subscriptions (instant sync across devices)
- ✅ Row-level security (users see only their data)
- ✅ Offline-first architecture (works without internet)

**Test it now:** Login on 2 devices and watch changes sync in real-time! 🚀

