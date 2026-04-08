// scripts/test-api.js
// Run: node scripts/test-api.js
// Tests all API endpoints against the running server

const BASE = `http://localhost:${process.env.PORT || 3001}`;
const USER = 'user_main';

let passed = 0, failed = 0;

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
  return data;
}

async function run() {
  console.log(`\n🧪 Testing PrepPath API at ${BASE}\n`);

  await test('Health check', async () => {
    const r = await fetch(`${BASE}/health`);
    const d = await r.json();
    if (d.status !== 'ok') throw new Error('Health check failed');
  });

  await test('GET progress (empty ok)', async () => {
    await req('GET', `/api/progress/${USER}`);
  });

  await test('POST progress (save state)', async () => {
    await req('POST', `/api/progress/${USER}`, {
      state: { chk_t0: true, chk_t1: false, rm_rm_1_1_s0: true }
    });
  });

  await test('GET progress (verify saved)', async () => {
    const d = await req('GET', `/api/progress/${USER}`);
    if (!d.data) throw new Error('No data returned');
  });

  await test('POST custom task', async () => {
    await req('POST', `/api/tasks/${USER}`, {
      project_id: 'proj_personal',
      label: 'Test task from API',
      difficulty: 'easy'
    });
  });

  await test('GET custom tasks', async () => {
    const d = await req('GET', `/api/tasks/${USER}`);
    if (!Array.isArray(d.data)) throw new Error('Expected array');
  });

  await test('POST journal entry', async () => {
    await req('POST', `/api/journal/${USER}`, {
      entry_date: new Date().toISOString().split('T')[0],
      learnt: 'C# OOP, arrays in DSA, GCP compute basics',
      confused: 'Inheritance vs composition',
      gratitude: 'Had energy to study today',
      verse_reflection: 'Philippians 4:13 gave me confidence'
    });
  });

  await test('GET journal entries', async () => {
    const d = await req('GET', `/api/journal/${USER}`);
    if (!Array.isArray(d.data)) throw new Error('Expected array');
  });

  await test('GET stats', async () => {
    const d = await req('GET', `/api/stats/${USER}`);
    if (!d.stats) throw new Error('No stats returned');
    console.log(`       Days until Sept: ${d.stats.days_until_sept}`);
  });

  await test('404 route', async () => {
    const r = await fetch(`${BASE}/api/nonexistent`);
    if (r.status !== 404) throw new Error('Expected 404');
  });

  console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch(console.error);
