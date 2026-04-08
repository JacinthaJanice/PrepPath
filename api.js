// api.js — all backend communication
// Falls back to localStorage if backend is unavailable

const API = (() => {
  const cfg = window.PP_CONFIG || {};
  const BASE = cfg.BACKEND_URL || '';
  const USER = cfg.USER_ID || 'user_main';

  async function request(method, path, body) {
    if (!BASE) throw new Error('No backend URL configured');
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  return {
    // ── Progress ──────────────────────────────────
    async loadProgress() {
      try {
        const { data } = await request('GET', `/api/progress/${USER}`);
        return data?.state_data || {};
      } catch {
        // Fallback: localStorage
        try { return JSON.parse(localStorage.getItem('pp3_state') || '{}'); } catch { return {}; }
      }
    },

    async saveProgress(state) {
      // Always save to localStorage first (instant)
      try { localStorage.setItem('pp3_state', JSON.stringify(state)); } catch {}
      // Then sync to backend
      try {
        await request('POST', `/api/progress/${USER}`, { state });
        return true;
      } catch { return false; }
    },

    // ── Custom Tasks ──────────────────────────────
    async getTasks() {
      try {
        const { data } = await request('GET', `/api/tasks/${USER}`);
        return data || [];
      } catch { return []; }
    },

    async addTask(project_id, label, difficulty = 'easy') {
      try {
        const { data } = await request('POST', `/api/tasks/${USER}`, { project_id, label, difficulty });
        return data;
      } catch { return null; }
    },

    async toggleTask(taskId, done) {
      try {
        const { data } = await request('PATCH', `/api/tasks/${USER}/${taskId}`, { done });
        return data;
      } catch { return null; }
    },

    async deleteTask(taskId) {
      try {
        await request('DELETE', `/api/tasks/${USER}/${taskId}`);
        return true;
      } catch { return false; }
    },

    // ── Journal ───────────────────────────────────
    async getJournal() {
      try {
        const { data } = await request('GET', `/api/journal/${USER}`);
        return data || [];
      } catch { return []; }
    },

    async saveJournal(entry) {
      try {
        const { data } = await request('POST', `/api/journal/${USER}`, entry);
        return data;
      } catch { return null; }
    },

    // ── Stats ─────────────────────────────────────
    async getStats() {
      try {
        const { stats } = await request('GET', `/api/stats/${USER}`);
        return stats;
      } catch { return null; }
    }
  };
})();
