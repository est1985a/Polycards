// Records word pronunciations with Google Cloud Text-to-Speech and uploads them to Supabase Storage.
// Mac only, never part of the app. Keys come from .env.audio (in .gitignore).
//
//   npm run audio -- --dry-run     list what would be recorded (no Google calls, no uploads)
//   npm run audio -- --limit 5     record only 5 words
//   npm run audio                  record every new or changed word
//   npm run audio -- --delay 500   wait 500 ms between Google requests (default 250)
//
// A word is recorded when it has no file yet, or its text (speak_as, or the cleaned English) or the
// voice changed. Run it again after adding or editing words.
import { createClient } from '@supabase/supabase-js';
import {
  VOICE, LANGUAGE, recordingText, needsRecording, audioFileName, parseOptions, googleErrorHint, stopsTheRun,
} from './audioPlan.js';
import { AUDIO_BUCKET } from '../src/lib/speech.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

let options;
try {
  options = parseOptions(process.argv.slice(2));
} catch (error) {
  fail(error.message);
}

const { GOOGLE_TTS_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) fail("Fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.audio first.");
if (!options.dryRun && !GOOGLE_TTS_API_KEY) fail("Fill in GOOGLE_TTS_API_KEY in .env.audio first (or use --dry-run).");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Every word, 1,000 rows at a time (Supabase's limit per query).
async function fetchAllWords() {
  const words = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('words')
      .select('id, english, speak_as, audio_path, audio_text, audio_voice')
      .order('id')
      .range(from, from + 999);
    if (error) {
      if (/speak_as|audio_path|audio_text|audio_voice/.test(error.message)) fail("The audio columns are missing: run supabase/polycards-word-audio.sql in the Supabase SQL editor first.");
      fail(`Could not read the words: ${error.message}`);
    }
    words.push(...data);
    if (data.length < 1000) return words;
  }
}

// One Google Text-to-Speech request → the MP3 bytes. Throws an error with .status and .stop.
async function synthesize(text) {
  const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(GOOGLE_TTS_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: LANGUAGE, name: VOICE },
      audioConfig: { audioEncoding: 'MP3' },
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.audioContent) {
    const message = body.error?.message || `HTTP ${response.status}`;
    const hint = googleErrorHint(response.status, message);
    const error = new Error(`Google: ${message}${hint ? `\n    → ${hint}` : ''}`);
    error.stop = stopsTheRun(response.status, message);
    throw error;
  }
  return Buffer.from(body.audioContent, 'base64');
}

async function record(word, text) {
  const path = audioFileName(word.id, text);
  const mp3 = await synthesize(text);
  const { error: uploadError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(path, mp3, { contentType: 'audio/mpeg', cacheControl: '31536000', upsert: true });
  if (uploadError) {
    const hint = /bucket not found/i.test(uploadError.message) ? "\n    → run supabase/polycards-word-audio.sql first" : "";
    throw new Error(`Upload: ${uploadError.message}${hint}`);
  }
  const { error: updateError } = await supabase
    .from('words')
    .update({ audio_path: path, audio_text: text, audio_voice: VOICE })
    .eq('id', word.id);
  if (updateError) throw new Error(`Saving the row: ${updateError.message}`);
  // The old recording (a different text or voice) isn't used any more.
  if (word.audio_path && word.audio_path !== path) {
    const { error } = await supabase.storage.from(AUDIO_BUCKET).remove([word.audio_path]);
    if (error) console.warn(`    (old file ${word.audio_path} not removed: ${error.message})`);
  }
  return mp3.length;
}

const words = await fetchAllWords();
const summary = { read: words.length, upToDate: 0, empty: [], todo: [], recorded: 0, failed: [], characters: 0, bytes: 0 };

for (const word of words) {
  const text = recordingText(word);
  if (!text) summary.empty.push(word);
  else if (needsRecording(word, text)) summary.todo.push({ word, text });
  else summary.upToDate++;
}

const batch = summary.todo.slice(0, options.limit);
console.log(`${summary.read} words: ${summary.upToDate} up to date, ${summary.todo.length} to record${batch.length < summary.todo.length ? ` (this run: ${batch.length})` : ''}. Voice: ${VOICE}`);
if (options.dryRun) console.log('Dry run: nothing is sent to Google and nothing is uploaded.\n');

for (const [i, { word, text }] of batch.entries()) {
  const label = `${String(i + 1).padStart(4)}. ${word.english}${text !== word.english ? `  →  "${text}"` : ''}`;
  if (options.dryRun) {
    console.log(`${label}   (${word.id})`);
    continue;
  }
  try {
    const bytes = await record(word, text);
    summary.recorded++;
    summary.characters += text.length;
    summary.bytes += bytes;
    console.log(`${label}   ✓`);
  } catch (error) {
    summary.failed.push({ word, reason: error.message });
    console.log(`${label}   ✗ ${error.message}`);
    if (error.stop) {
      console.log('\nStopped: this error would happen for every word.');
      break;
    }
  }
  if (i < batch.length - 1) await sleep(options.delayMs);
}

console.log('\n--- Summary ---');
console.log(`Words read:          ${summary.read}`);
console.log(`Already up to date:  ${summary.upToDate}`);
if (options.dryRun) console.log(`Would record:        ${batch.length} (${batch.reduce((n, b) => n + b.text.length, 0)} characters)`);
else {
  console.log(`Recorded:            ${summary.recorded} (${summary.characters} characters, ${(summary.bytes / 1024).toFixed(0)} KB)`);
  console.log(`Failed:              ${summary.failed.length}`);
  for (const { word, reason } of summary.failed) console.log(`  - ${word.english} (${word.id}): ${reason.split('\n')[0]}`);
}
if (summary.todo.length > batch.length) console.log(`Left for later:      ${summary.todo.length - batch.length} (--limit)`);
if (summary.empty.length) {
  console.log(`Skipped (no text):   ${summary.empty.length}`);
  for (const w of summary.empty) console.log(`  - "${w.english}" (${w.id}): set speak_as to record it`);
}
if (summary.failed.length) process.exitCode = 1;
