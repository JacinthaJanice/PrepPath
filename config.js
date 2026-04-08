// config.js — loaded before the main app
// Change BACKEND_URL to your deployed backend once hosted

window.PP_CONFIG = {
  // ── Change this to your backend URL when deployed ──
  // Local dev:  'http://localhost:3001'
  // Render.com: 'https://preppath-api.onrender.com'
  // Railway:    'https://preppath-api.up.railway.app'
  BACKEND_URL: 'http://localhost:3001',

  // Supabase direct (fallback if no backend)
  // Fill these from Supabase → Settings → API
  SUPABASE_URL: 'https://ydmmcxemzxxifpvdwgsw.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_5XFKr2QsT_4YFO9Wr3y1qQ_r2nQlICveyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbW1jeGVtenh4aWZwdmR3Z3N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTM3MTIsImV4cCI6MjA5MTA2OTcxMn0.U0paO2Q7cQL-ldeuAK-55hCkrbtFyl_h-dM6u8Hz4lY',

  // Default user — for single-user use just leave this
  // Later you can add login and swap this for the logged-in user's ID
  USER_ID: 'user_main',

  // How often to auto-sync state (ms) — 0 to disable
  AUTO_SYNC_MS: 30000,

  APP_VERSION: '3.0.0'
};
