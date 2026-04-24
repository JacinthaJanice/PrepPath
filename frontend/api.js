// api.js — all data communication
// Uses Supabase JS SDK directly for cross-device sync.
// Falls back to localStorage when Supabase is unavailable.

const API = (() => {
  const cfg = window.PP_CONFIG || {};
  const USER = cfg.USER_ID || 'user_main';

  // Initialise Supabase client (loaded via CDN before this script)
  let sb = null;
  if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) {
    try {
      sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    } catch (e) {
      console.warn('[API] Supabase init failed, using localStorage:', e.message);
    }
  }

  // ── localStorage helpers ──────────────────────────────
  function lsGet(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }

  // ── UUID helper (works on HTTP and older browsers) ────
  function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  return {
    // ── Progress ──────────────────────────────────────────
    async loadProgress() {
      if (sb) {
        try {
          const { data, error } = await sb
            .from('progress')
            .select('*')
            .eq('user_id', USER)
            .single();
          if (!error && data) {
            lsSet('pp3_state', data.state_data);
            return data.state_data || {};
          }
        } catch {}
      }
      return lsGet('pp3_state') || {};
    },

    async saveProgress(state) {
      lsSet('pp3_state', state);
      if (sb) {
        try {
          const { error } = await sb
            .from('progress')
            .upsert(
              { user_id: USER, state_data: state, updated_at: new Date().toISOString() },
              { onConflict: 'user_id' }
            );
          return !error;
        } catch {}
      }
      return false;
    },

    // ── Custom Tasks ──────────────────────────────────────
    async getTasks() {
      if (sb) {
        try {
          const { data, error } = await sb
            .from('custom_tasks')
            .select('*')
            .eq('user_id', USER)
            .order('created_at', { ascending: true });
          if (!error) return data || [];
        } catch {}
      }
      return lsGet('pp3_tasks') || [];
    },

    async addTask(project_id, label, difficulty = 'easy') {
      if (sb) {
        try {
          const { data, error } = await sb
            .from('custom_tasks')
            .insert({
              id: uuid(),
              user_id: USER,
              project_id,
              label,
              difficulty: difficulty || 'easy',
              done: false,
              created_at: new Date().toISOString()
            })
            .select()
            .single();
          if (!error) return data;
        } catch {}
      }
      // localStorage fallback
      const tasks = lsGet('pp3_tasks') || [];
      const task = {
        id: uuid(),
        user_id: USER,
        project_id,
        label,
        difficulty: difficulty || 'easy',
        done: false,
        created_at: new Date().toISOString()
      };
      tasks.push(task);
      lsSet('pp3_tasks', tasks);
      return task;
    },

    async toggleTask(taskId, done) {
      if (sb) {
        try {
          const { data, error } = await sb
            .from('custom_tasks')
            .update({ done, updated_at: new Date().toISOString() })
            .eq('id', taskId)
            .eq('user_id', USER)
            .select()
            .single();
          if (!error) return data;
        } catch {}
      }
      const tasks = lsGet('pp3_tasks') || [];
      const task = tasks.find(t => t.id === taskId);
      if (task) { task.done = done; lsSet('pp3_tasks', tasks); }
      return task || null;
    },

    async deleteTask(taskId) {
      if (sb) {
        try {
          const { error } = await sb
            .from('custom_tasks')
            .delete()
            .eq('id', taskId)
            .eq('user_id', USER);
          if (!error) return true;
        } catch {}
      }
      lsSet('pp3_tasks', (lsGet('pp3_tasks') || []).filter(t => t.id !== taskId));
      return true;
    },

    // ── Journal ───────────────────────────────────────────
    async getJournal() {
      if (sb) {
        try {
          const { data, error } = await sb
            .from('journal')
            .select('*')
            .eq('user_id', USER)
            .order('entry_date', { ascending: false })
            .limit(30);
          if (!error) return data || [];
        } catch {}
      }
      return lsGet('pp3_journal') || [];
    },

    async saveJournal(entry) {
      const today = new Date().toISOString().split('T')[0];
      const payload = { ...entry, user_id: USER, entry_date: entry.entry_date || today, updated_at: new Date().toISOString() };
      if (sb) {
        try {
          const { data, error } = await sb
            .from('journal')
            .upsert(payload, { onConflict: 'user_id,entry_date' })
            .select()
            .single();
          if (!error) return data;
        } catch {}
      }
      const journal = lsGet('pp3_journal') || [];
      const idx = journal.findIndex(j => j.entry_date === payload.entry_date);
      if (idx >= 0) journal[idx] = { ...journal[idx], ...payload };
      else journal.unshift(payload);
      lsSet('pp3_journal', journal);
      return payload;
    },

    // ── Stats ─────────────────────────────────────────────
    async getStats() {
      if (sb) {
        try {
          const [pRes, tRes, jRes] = await Promise.all([
            sb.from('progress').select('state_data,updated_at').eq('user_id', USER).single(),
            sb.from('custom_tasks').select('done').eq('user_id', USER),
            sb.from('journal').select('entry_date').eq('user_id', USER).order('entry_date', { ascending: false })
          ]);
          const state = pRes.data?.state_data || {};
          const tasks = tRes.data || [];
          const journal = jRes.data || [];
          return {
            schedule_tasks_done:  Object.keys(state).filter(k => k.startsWith('chk_') && state[k]).length,
            roadmap_steps_done:   Object.keys(state).filter(k => k.startsWith('rm_')  && state[k]).length,
            future_steps_done:    Object.keys(state).filter(k => k.startsWith('fs_')  && state[k]).length,
            project_tasks_done:   Object.keys(state).filter(k => k.startsWith('pt_')  && state[k]).length,
            custom_tasks_total:   tasks.length,
            custom_tasks_done:    tasks.filter(t => t.done).length,
            journal_entries:      journal.length,
            last_active:          pRes.data?.updated_at || null,
            days_until_sept:      Math.max(0, Math.floor((new Date(new Date().getFullYear() + (new Date().getMonth() >= 8 ? 1 : 0), 8, 30) - new Date()) / 86400000))
          };
        } catch {}
      }
      return null;
    }
  };
})();
