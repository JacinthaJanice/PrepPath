// scripts/setup-db.js
// Run: node scripts/setup-db.js
// Verifies all tables exist and seeds initial data

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_BACKEND_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_BACKEND_KEY) {
  console.error('\n✗ Missing required environment variables.');
  console.error('  Expected SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_KEY) in backend/.env');
  console.error('  The backend key must not match SUPABASE_ANON_KEY.');
  console.error('  Then re-run: npm run setup-db\n');
  process.exit(1);
}

if (SUPABASE_ANON_KEY && SUPABASE_ANON_KEY === SUPABASE_BACKEND_KEY) {
  console.error('\n✗ SUPABASE_ANON_KEY and backend key are identical.');
  console.error('  Use SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_KEY from Supabase Settings > API.');
  process.exit(1);
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_BACKEND_KEY
);

const TABLES = ['progress', 'custom_tasks', 'journal', 'study_sessions'];

async function verify() {
  console.log('\n🔍 Verifying PrepPath database...\n');

  for (const table of TABLES) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`  ✗ ${table.padEnd(20)} — MISSING (run database/setup.sql in Supabase SQL Editor)`);
    } else {
      console.log(`  ✓ ${table.padEnd(20)} — OK`);
    }
  }

  // Check seed user (only valid for expected schema)
  const seedCheck = await supabase.from('progress').select('user_id').eq('user_id', 'user_main');
  if (seedCheck.error) {
    console.log(`\n  ⚠  Progress schema differs from expected columns (user_id/state_data).`);
    console.log(`     Error: ${seedCheck.error.message}`);
  } else if (seedCheck.data && seedCheck.data.length > 0) {
    console.log(`\n  ✓ Seed user 'user_main' exists`);
  } else {
    console.log(`\n  ⚠  Seed user missing — inserting...`);
    let seedInsert = await supabase.from('progress').upsert({ user_id: 'user_main', state_data: {} });
    if (seedInsert.error && String(seedInsert.error.message || '').includes('null value in column "id"')) {
      seedInsert = await supabase
        .from('progress')
        .insert({ id: randomUUID(), user_id: 'user_main', state_data: {} });
    }
    if (seedInsert.error) {
      console.log(`  ✗ Could not create seed user: ${seedInsert.error.message}`);
    } else {
      console.log(`  ✓ Seed user created`);
    }
  }

  console.log('\n✅ Database check complete.\n');
}

verify().catch(console.error);
