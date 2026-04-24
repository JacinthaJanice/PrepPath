// scripts/test-api.js
// Run: node scripts/test-api.js
// Tests all API endpoints against the running server

const BASE = `http://localhost:${process.env.PORT || 3001}`;
const USER = 'user_main';

let passed = 0, failed = 0;
let createdTaskId = null;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name} — ${e.message}`);
    failed++;
  }
}

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (!data.success && res.status !== 200) throw new Error(data.error || 'Failed');
  return { data, status: res.status };
}

async function reqRaw(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: res.status, data: await res.json() };
}

async function run() {
  console.log(`\n🧪 Testing PrepPath API at ${BASE}\n`);

  // ── Health ────────────────────────────────────────
  console.log('Health');
  await test('Health check returns ok', async () => {
    const r = await fetch(`${BASE}/health`);
    const d = await r.json();
    if (d.status !== 'ok') throw new Error('Health check failed');
    if (!d.timestamp) throw new Error('Missing timestamp');
  });

  // ── Progress ──────────────────────────────────────
  console.log('\nProgress');
  await test('GET progress (empty ok)', async () => {
    await req('GET', `/api/progress/${USER}`);
  });

  await test('POST progress (save state)', async () => {
    const { data } = await req('POST', `/api/progress/${USER}`, {
      state: { chk_t0: true, chk_t1: false, rm_rm_1_1_s0: true }
    });
    if (!data.data) throw new Error('No data returned after save');
  });

  await test('GET progress (verify saved state)', async () => {
    const { data } = await req('GET', `/api/progress/${USER}`);
    if (!data.data) throw new Error('No data returned');
    if (data.data.state_data?.chk_t0 !== true) throw new Error('Saved state not persisted');
  });

  await test('POST progress (overwrite state)', async () => {
    const { data } = await req('POST', `/api/progress/${USER}`, {
      state: { chk_t0: false, rm_rm_1_1_s0: true, rm_rm_1_1_s1: true }
    });
    if (!data.data) throw new Error('No data returned after overwrite');
  });

  // ── Custom Tasks ──────────────────────────────────
  console.log('\nCustom Tasks');
  await test('POST custom task', async () => {
    const { data } = await req('POST', `/api/tasks/${USER}`, {
      project_id: 'proj_personal',
      label: 'Test task from API',
      difficulty: 'easy'
    });
    if (!data.data?.id) throw new Error('No task id returned');
    createdTaskId = data.data.id;
  });

  await test('POST custom task — medium difficulty', async () => {
    await req('POST', `/api/tasks/${USER}`, {
      project_id: 'proj_recruiter',
      label: 'Medium task',
      difficulty: 'medium'
    });
  });

  await test('POST custom task — missing label returns 400', async () => {
    const { status, data } = await reqRaw('POST', `/api/tasks/${USER}`, {
      project_id: 'proj_personal'
    });
    if (status !== 400) throw new Error(`Expected 400, got ${status}`);
    if (data.success !== false) throw new Error('Expected success:false');
  });

  await test('POST custom task — missing project_id returns 400', async () => {
    const { status, data } = await reqRaw('POST', `/api/tasks/${USER}`, {
      label: 'No project task'
    });
    if (status !== 400) throw new Error(`Expected 400, got ${status}`);
    if (data.success !== false) throw new Error('Expected success:false');
  });

  await test('GET custom tasks', async () => {
    const { data } = await req('GET', `/api/tasks/${USER}`);
    if (!Array.isArray(data.data)) throw new Error('Expected array');
    if (data.data.length < 1) throw new Error('Expected at least one task');
  });

  await test('PATCH custom task — toggle done', async () => {
    if (!createdTaskId) throw new Error('No task id from earlier test');
    const { data } = await req('PATCH', `/api/tasks/${USER}/${createdTaskId}`, { done: true });
    if (data.data?.done !== true) throw new Error('Task not marked done');
  });

  await test('PATCH custom task — toggle not done', async () => {
    if (!createdTaskId) throw new Error('No task id from earlier test');
    const { data } = await req('PATCH', `/api/tasks/${USER}/${createdTaskId}`, { done: false });
    if (data.data?.done !== false) throw new Error('Task not marked undone');
  });

  await test('PATCH custom task — update label', async () => {
    if (!createdTaskId) throw new Error('No task id from earlier test');
    const { data } = await req('PATCH', `/api/tasks/${USER}/${createdTaskId}`, { label: 'Updated label' });
    if (data.data?.label !== 'Updated label') throw new Error('Label not updated');
  });

  await test('DELETE custom task', async () => {
    if (!createdTaskId) throw new Error('No task id from earlier test');
    await req('DELETE', `/api/tasks/${USER}/${createdTaskId}`);
  });

  await test('GET custom tasks after delete (count decreased)', async () => {
    const { data } = await req('GET', `/api/tasks/${USER}`);
    if (!Array.isArray(data.data)) throw new Error('Expected array');
    const deleted = data.data.find(t => t.id === createdTaskId);
    if (deleted) throw new Error('Deleted task still present');
  });

  // ── Journal ───────────────────────────────────────
  console.log('\nJournal');
  const today = new Date().toISOString().split('T')[0];

  await test('POST journal entry', async () => {
    const { data } = await req('POST', `/api/journal/${USER}`, {
      entry_date: today,
      learnt: 'C# OOP, arrays in DSA, GCP compute basics',
      confused: 'Inheritance vs composition',
      gratitude: 'Had energy to study today',
      verse_reflection: 'Philippians 4:13 gave me confidence'
    });
    if (!data.data) throw new Error('No data returned');
  });

  await test('POST journal entry (upsert same date)', async () => {
    const { data } = await req('POST', `/api/journal/${USER}`, {
      entry_date: today,
      learnt: 'Updated learning note',
      confused: '',
      gratitude: 'Grateful for progress',
      verse_reflection: ''
    });
    if (data.data?.learnt !== 'Updated learning note') throw new Error('Upsert did not update learnt');
  });

  await test('GET journal entries', async () => {
    const { data } = await req('GET', `/api/journal/${USER}`);
    if (!Array.isArray(data.data)) throw new Error('Expected array');
    if (data.data.length < 1) throw new Error('Expected at least one entry');
    const entry = data.data.find(e => e.entry_date === today);
    if (!entry) throw new Error('Today\'s entry not found');
  });

  // ── Stats ─────────────────────────────────────────
  console.log('\nStats');
  await test('GET stats', async () => {
    const { data } = await req('GET', `/api/stats/${USER}`);
    if (!data.stats) throw new Error('No stats returned');
    const expected = ['schedule_tasks_done','roadmap_steps_done','future_steps_done',
                      'project_tasks_done','custom_tasks_total','custom_tasks_done',
                      'journal_entries','last_active','days_until_sept'];
    for (const key of expected) {
      if (!(key in data.stats)) throw new Error(`Missing stats key: ${key}`);
    }
  });

  await test('GET stats — days_until_sept is non-negative', async () => {
    const { data } = await req('GET', `/api/stats/${USER}`);
    if (data.stats.days_until_sept < 0) throw new Error('days_until_sept is negative');
  });

  await test('GET stats — journal_entries > 0 after saving', async () => {
    const { data } = await req('GET', `/api/stats/${USER}`);
    if (data.stats.journal_entries < 1) throw new Error('Expected at least 1 journal entry in stats');
  });

  // ── Error Handling ────────────────────────────────
  console.log('\nError handling');
  await test('404 route returns 404', async () => {
    const r = await fetch(`${BASE}/api/nonexistent`);
    if (r.status !== 404) throw new Error('Expected 404');
  });

  await test('404 returns success:false', async () => {
    const r = await fetch(`${BASE}/api/nonexistent`);
    const d = await r.json();
    if (d.success !== false) throw new Error('Expected success:false on 404');
  });

  // ── Summary ───────────────────────────────────────
  console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch(console.error);

