// Drafts the dictionary's word-detail batches (dictionary phase 3): countable / plural for nouns and
// the four verb forms for verbs. Reads the live library with the public (read-only) key, applies the
// rules in wordForms.js and the hand-checked fixes in scripts/word-details/fixes.json, and writes
//   supabase/word-details-<kind>-<n>.sql  (fills only empty columns, safe to run twice)
//   supabase/word-details-<kind>-<n>.csv  (the same rows, easy to read before running the SQL)
//
//   node scripts/wordDetails.mjs nouns 1        → batch 1 of the nouns
//   node scripts/wordDetails.mjs verbs 2
//   node scripts/wordDetails.mjs nouns list     → how many batches there are
//   node scripts/wordDetails.mjs nouns missing  → candidates whose data is still empty in the database
//                                                 (the catch-up batch after new words are imported)
// Batches are fixed slices of the candidate list sorted A–Z, so batch numbers stay stable until new
// words are imported (new words go in a catch-up batch, `missing`).
import { readFileSync, writeFileSync } from 'node:fs';
import { candidates, draftRow, toSql, toCsv, BATCH_SIZE } from './wordDetailsPlan.js';

const SUPABASE_URL = 'https://erhudovlvqynpkmtgsef.supabase.co';
const PUBLIC_KEY = 'sb_publishable_vR1WnHVHYOGklkoHAVPzvg_upyke-kS'; // the app's public key (read-only)

async function fetchWords() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/words?select=*&order=id`, {
      headers: { apikey: PUBLIC_KEY, Range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`Could not read the words: ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

const [kind, which] = process.argv.slice(2);
if (!['nouns', 'verbs'].includes(kind) || !which) {
  console.error('Usage: node scripts/wordDetails.mjs nouns|verbs <batch number>|list|missing');
  process.exit(1);
}
const fixes = JSON.parse(readFileSync(new URL('./word-details/fixes.json', import.meta.url), 'utf8'));
const words = await fetchWords();
const list = candidates(words, kind, fixes);
const batches = Math.ceil(list.length / BATCH_SIZE);

if (which === 'list') {
  console.log(`${kind}: ${list.length} candidates in ${batches} batches of up to ${BATCH_SIZE}`);
  process.exit(0);
}
const rows = which === 'missing'
  ? list.filter((w) => (kind === 'nouns' ? w.countable == null : w.verb_past == null))
  : list.slice((Number(which) - 1) * BATCH_SIZE, Number(which) * BATCH_SIZE);
if (rows.length === 0) { console.log('Nothing to do.'); process.exit(0); }

const drafted = rows.map((w) => draftRow(w, kind, fixes));
const name = `word-details-${kind}-${which}`;
const out = new URL(`../supabase/${name}`, import.meta.url);
writeFileSync(`${out.pathname}.sql`, toSql(drafted, kind, name, which === 'missing' ? 'catch-up' : `batch ${which} of ${batches}`));
writeFileSync(`${out.pathname}.csv`, toCsv(drafted, kind));
console.log(`Wrote supabase/${name}.sql and .csv: ${drafted.length} words`);
