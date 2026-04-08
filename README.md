# PrepPath v3 — Full Stack Setup Guide

> Your personal placement preparation app with real database sync.

---

## 📁 Project Structure

```
preppath/
├── frontend/           ← The HTML app (deploy to GitHub Pages)
│   ├── index.html      ← Main app (rename preppath-v3.html → index.html)
│   ├── config.js       ← API URL + Supabase keys
│   ├── api.js          ← All backend communication
│   └── package.json
│
├── backend/            ← Express API server (deploy to Render/Railway)
│   ├── server.js       ← Main server + all routes
│   ├── .env.example    ← Copy to .env and fill in keys
│   ├── scripts/
│   │   ├── setup-db.js ← Verify database tables
│   │   └── test-api.js ← Test all API endpoints
│   └── package.json
│
├── database/
│   └── setup.sql       ← Run this once in Supabase SQL Editor
│
├── .github/workflows/
│   └── deploy.yml      ← Auto-deploy frontend to GitHub Pages
│
└── scripts/
    └── install.sh      ← One-shot installer
```

---

## ⚡ Quick Start (Local)

### Step 1 — Run the installer

```bash
bash scripts/install.sh
```

### Step 2 — Set up Supabase database

1. Go to [supabase.com](https://supabase.com) → Create free account
2. New project → any name → any region → any password
3. Wait ~2 min for project to spin up
4. Go to **SQL Editor** → New Query
5. Copy everything from `database/setup.sql` → Paste → **Run**
6. You should see: "Success. No rows returned"

### Step 3 — Get your Supabase keys

1. Supabase → **Settings** → **API**
2. Copy: **Project URL** (looks like `https://abcde.supabase.co`)
3. Copy: **Publishable (anon) key** (frontend)
4. Copy: **Secret key** (backend only — never expose in frontend)
   - If your project shows legacy keys, use `service_role` for backend.

### Step 4 — Configure backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SECRET_KEY=your-secret-key
PORT=3001
ALLOWED_ORIGINS=http://localhost:3000,https://YOUR-USERNAME.github.io
```

### Step 5 — Start backend

```bash
cd backend
npm run dev
# → Running on http://localhost:3001
```

### Step 6 — Configure frontend

Edit `frontend/config.js`:

```js
BACKEND_URL: 'http://localhost:3001',
SUPABASE_URL: 'https://your-project.supabase.co',
SUPABASE_ANON_KEY: 'your-anon-key',
```

### Step 7 — Start frontend

```bash
cd frontend
npm run dev
# → Opens http://localhost:3000
```

### Step 8 — Verify everything

```bash
cd backend
npm run setup-db    # checks database tables
npm test            # tests all API endpoints
```

---

## 🌐 Deploying to GitHub Pages (Frontend)

1. Create a GitHub repo named `preppath`
2. Put everything in the `frontend/` folder at the root of the repo
   - Rename `preppath-v3.html` → `index.html`
   - Include `config.js` and `api.js`
3. Go to **Settings → Pages → Branch: main → Save**
4. Your app is live at: `https://YOUR-USERNAME.github.io/preppath`

Or use the GitHub Actions workflow (auto-deploys on every push to main):

- The file `.github/workflows/deploy.yml` handles this automatically

---

## 🚀 Deploying Backend (Free Options)

### Option A — Render.com (recommended, free tier)

1. Go to [render.com](https://render.com) → New Web Service
2. Connect your GitHub repo
3. Root directory: `backend`
4. Build command: `npm install`
5. Start command: `node server.js`
6. Add environment variables from your `.env`
7. Your backend URL: `https://preppath-api.onrender.com`
8. Update `frontend/config.js` → `BACKEND_URL` with this URL
9. Update `.env` → `ALLOWED_ORIGINS` to include your GitHub Pages URL

### Option B — Railway.app (also free)

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select your repo → set root to `backend/`
4. Add environment variables
5. Done

---

## 🗄️ Database Tables

| Table            | Purpose                                                     |
| ---------------- | ----------------------------------------------------------- |
| `progress`       | All checkbox/toggle state (roadmap, schedule, future steps) |
| `custom_tasks`   | User-added tasks in project cards                           |
| `journal`        | Evening reflection entries (one per day)                    |
| `study_sessions` | Study time tracking (optional, for future)                  |

---

## 🔌 API Endpoints

| Method | Endpoint                     | Description          |
| ------ | ---------------------------- | -------------------- |
| GET    | `/health`                    | Server health check  |
| GET    | `/api/progress/:userId`      | Load all progress    |
| POST   | `/api/progress/:userId`      | Save progress state  |
| GET    | `/api/tasks/:userId`         | Get custom tasks     |
| POST   | `/api/tasks/:userId`         | Add custom task      |
| PATCH  | `/api/tasks/:userId/:taskId` | Update/toggle task   |
| DELETE | `/api/tasks/:userId/:taskId` | Delete task          |
| GET    | `/api/journal/:userId`       | Get journal entries  |
| POST   | `/api/journal/:userId`       | Save journal entry   |
| GET    | `/api/stats/:userId`         | Get progress summary |

---

## 💾 How Data is Stored

```
User checks a task
     ↓
localStorage (instant, works offline)
     ↓
Backend API (async, in background)
     ↓
Supabase PostgreSQL database
     ↓
Syncs to all your devices
```

Data **never expires** — Supabase free tier stores data indefinitely.
localStorage is a backup for offline use.

---

## 🛠️ Tech Stack

| Layer              | Technology                   |
| ------------------ | ---------------------------- |
| Frontend           | Vanilla HTML/CSS/JS          |
| Backend            | Node.js + Express            |
| Database           | PostgreSQL via Supabase      |
| Hosting (Frontend) | GitHub Pages (free)          |
| Hosting (Backend)  | Render.com or Railway (free) |
| CI/CD              | GitHub Actions               |

---

## ✝️ Philippians 4:13

_"I can do all things through Christ who strengthens me."_

You have everything you need. Start today.
>>>>>>> 219b25c (uploading to github from vscode direct)
