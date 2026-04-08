// ════════════════════════════════════════════════
//  PrepPath Backend — server.js
//  Express + Supabase
// ════════════════════════════════════════════════

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 }   = require('uuid');

const app  = express();
const PORT = process.env.PORT || 3001;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_BACKEND_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_BACKEND_KEY) {
  console.error('✗ Missing SUPABASE_URL and backend key in backend/.env');
  console.error('  Set SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_KEY (legacy).');
  process.exit(1);
}

if (SUPABASE_ANON_KEY && SUPABASE_ANON_KEY === SUPABASE_BACKEND_KEY) {
  console.error('✗ Backend key must not be the same as SUPABASE_ANON_KEY.');
  console.error('  Use SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_KEY from Supabase Settings > API.');
  process.exit(1);
}

// ── Supabase client ──────────────────────────────
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_BACKEND_KEY  // secret/service key for backend operations
);

// ── Middleware ───────────────────────────────────
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Rate limiting — 100 requests / 15 min per IP
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true });
app.use('/api/', limiter);

// ── Health check ─────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: process.env.APP_VERSION || '3.0.0', timestamp: new Date().toISOString() });
});

// ════════════════════════════════════════════════
//  PROGRESS ROUTES
//  All user progress (checklist, roadmap, projects, future steps)
// ════════════════════════════════════════════════

// GET /api/progress/:userId  — load all progress for a user
app.get('/api/progress/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', req.params.userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    res.json({ success: true, data: data || null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/progress/:userId  — save / upsert progress
app.post('/api/progress/:userId', async (req, res) => {
  try {
    const payload = {
      user_id:    req.params.userId,
      state_data: req.body.state,
      updated_at: new Date().toISOString()
    };

    let { data, error } = await supabase
      .from('progress')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    // Legacy compatibility: some older schemas have NOT NULL id without a default.
    // Retry with generated id only when that specific constraint is hit.
    if (error && String(error.message || '').includes('null value in column "id"')) {
      const existing = await supabase
        .from('progress')
        .select('user_id')
        .eq('user_id', req.params.userId)
        .maybeSingle();

      if (existing.data) {
        ({ data, error } = await supabase
          .from('progress')
          .update({ state_data: req.body.state, updated_at: new Date().toISOString() })
          .eq('user_id', req.params.userId)
          .select()
          .single());
      } else {
        ({ data, error } = await supabase
          .from('progress')
          .insert({ ...payload, id: uuidv4() })
          .select()
          .single());
      }
    }

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ════════════════════════════════════════════════
//  CUSTOM TASKS ROUTES
// ════════════════════════════════════════════════

// GET /api/tasks/:userId  — get all custom tasks
app.get('/api/tasks/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('custom_tasks')
      .select('*')
      .eq('user_id', req.params.userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/tasks/:userId  — add a custom task
app.post('/api/tasks/:userId', async (req, res) => {
  try {
    const { project_id, label, difficulty } = req.body;
    if (!project_id || !label) return res.status(400).json({ success: false, error: 'project_id and label required' });

    const { data, error } = await supabase
      .from('custom_tasks')
      .insert({
        id:         uuidv4(),
        user_id:    req.params.userId,
        project_id,
        label,
        difficulty: difficulty || 'easy',
        done:       false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/tasks/:userId/:taskId  — toggle done / update
app.patch('/api/tasks/:userId/:taskId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('custom_tasks')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.taskId)
      .eq('user_id', req.params.userId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/tasks/:userId/:taskId
app.delete('/api/tasks/:userId/:taskId', async (req, res) => {
  try {
    const { error } = await supabase
      .from('custom_tasks')
      .delete()
      .eq('id', req.params.taskId)
      .eq('user_id', req.params.userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ════════════════════════════════════════════════
//  JOURNAL ROUTES (evening reflection notes)
// ════════════════════════════════════════════════

// GET /api/journal/:userId  — get all journal entries
app.get('/api/journal/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('journal')
      .select('*')
      .eq('user_id', req.params.userId)
      .order('entry_date', { ascending: false })
      .limit(30);

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/journal/:userId  — save journal entry
app.post('/api/journal/:userId', async (req, res) => {
  try {
    const { entry_date, learnt, confused, gratitude, verse_reflection } = req.body;

    const { data, error } = await supabase
      .from('journal')
      .upsert({
        user_id: req.params.userId,
        entry_date: entry_date || new Date().toISOString().split('T')[0],
        learnt,
        confused,
        gratitude,
        verse_reflection,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,entry_date' })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ════════════════════════════════════════════════
//  STATS ROUTES
// ════════════════════════════════════════════════

// GET /api/stats/:userId  — computed stats summary
app.get('/api/stats/:userId', async (req, res) => {
  try {
    const [progressRes, tasksRes, journalRes] = await Promise.all([
      supabase.from('progress').select('state_data,updated_at').eq('user_id', req.params.userId).single(),
      supabase.from('custom_tasks').select('done').eq('user_id', req.params.userId),
      supabase.from('journal').select('entry_date').eq('user_id', req.params.userId).order('entry_date', { ascending: false })
    ]);

    const state = progressRes.data?.state_data || {};
    const tasks = tasksRes.data || [];
    const journal = journalRes.data || [];

    // Count checked items
    const checkedKeys = Object.keys(state).filter(k => k.startsWith('chk_') && state[k]);
    const roadmapKeys = Object.keys(state).filter(k => k.startsWith('rm_') && state[k]);
    const futureKeys  = Object.keys(state).filter(k => k.startsWith('fs_') && state[k]);
    const projKeys    = Object.keys(state).filter(k => k.startsWith('pt_') && state[k]);

    res.json({
      success: true,
      stats: {
        schedule_tasks_done:  checkedKeys.length,
        roadmap_steps_done:   roadmapKeys.length,
        future_steps_done:    futureKeys.length,
        project_tasks_done:   projKeys.length,
        custom_tasks_total:   tasks.length,
        custom_tasks_done:    tasks.filter(t => t.done).length,
        journal_entries:      journal.length,
        last_active:          progressRes.data?.updated_at || null,
        days_until_sept:      Math.max(0, Math.floor((new Date('2025-09-30') - new Date()) / 86400000))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── 404 handler ──────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, error: 'Route not found' }));

// ── Error handler ────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ── Start ────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 PrepPath backend running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Env:    ${process.env.NODE_ENV || 'development'}\n`);
});
