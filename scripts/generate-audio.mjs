// Records word pronunciations with Gemini TTS (gemini-3.8-flash-tts, voice Achird) and uploads
// them to Supabase Storage as small mono MP3s. Runs on the Mac or the Windows PC (each has its own
// .env.audio and service account JSON file), never part of the app. Keys come from .env.audio (in .gitignore).
//
//   npm run audio -- --dry-run                    list what would be recorded + a cost estimate (no Google calls)
//   npm run audio -- --preview                    record 10 words into audio-preview/ to listen to (no upload)
//   npm run audio -- --word "dog" --word "How about you?"   re-record just these words
//   npm run audio                                 record every new or changed word (keeps old Chirp clips)
//   npm run audio -- --overwrite-chirp            also replace the old Chirp clips
//   npm run audio -- --limit 5 --delay 2000       only 5 words, 2 s between Google requests (default 1000 ms)
//
// A word is recorded when it has no file yet, or its text (speak_as, or the cleaned English) changed.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { GoogleAuth } from 'google-auth-library';
import {
  ENGINE, MAX_RETRIES, recordingText, planWord, matchesWord, audioFileName, geminiUrl, geminiRequest,
  audioFromResponse, parseWav, encodeMp3, guessTokens, audioTokensFor, estimateCost, isRetryable, retryDelay,
  parseOptions, googleErrorHint, stopsTheRun,
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

const { GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_CLOUD_PROJECT, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) fail("Fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.audio first.");
if (!options.dryRun && (!GOOGLE_APPLICATION_CREDENTIALS || !GOOGLE_CLOUD_PROJECT)) {
  fail("Fill in GOOGLE_APPLICATION_CREDENTIALS (full path to the service account JSON file) and GOOGLE_CLOUD_PROJECT (the project ID) in .env.audio first (or use --dry-run).");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });

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

function googleError(status, message) {
  const hint = googleErrorHint(status, message);
  const error = new Error(`Google: ${message}${hint ? `\n    → ${hint}` : ''}`);
  error.stop = stopsTheRun(status, message);
  return error;
}

// One Gemini request → { wav, usage }. Retries rate limits and server errors. Throws an error with .stop.
async function synthesize(text) {
  let token;
  try {
    token = await auth.getAccessToken();
  } catch (error) {
    const e = googleError(401, error.message);
    e.stop = true;
    throw e;
  }
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(geminiUrl(GOOGLE_CLOUD_PROJECT), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(geminiRequest(text)),
    });
    const body = await response.json().catch(() => ({}));
    const data = response.ok ? audioFromResponse(body) : null;
    if (data) return { wav: Buffer.from(data, 'base64'), usage: body.usageMetadata || {} };
    const message = body.error?.message || (response.ok ? 'no audio in the answer' : `HTTP ${response.status}`);
    if (attempt < MAX_RETRIES && isRetryable(response.status, `${body.error?.status || ''} ${message}`)) {
      const wait = retryDelay(attempt, response.headers.get('retry-after'));
      console.log(`    (${response.status}: waiting ${wait / 1000} s, then retry ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(wait);
      continue;
    }
    throw googleError(response.status, message);
  }
}

// Records one word → { bytes, inputTokens, audioTokens }. Uploads and saves the row unless previewing.
async function record(word, text) {
  const { wav, usage } = await synthesize(text);
  const { samples, sampleRate, seconds } = parseWav(wav);
  const mp3 = encodeMp3(samples, sampleRate);
  const path = audioFileName(word.id, text);
  const tokens = {
    inputTokens: usage.promptTokenCount ?? guessTokens(text).inputTokens,
    audioTokens: usage.candidatesTokenCount ?? audioTokensFor(seconds),
  };

  if (options.preview) {
    const name = `${word.english.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'word'}-${path}`;
    await writeFile(join(options.preview, name), mp3);
    return { bytes: mp3.length, ...tokens };
  }

  const { error: uploadError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(path, mp3, { contentType: 'audio/mpeg', cacheControl: '31536000', upsert: true });
  if (uploadError) {
    const hint = /bucket not found/i.test(uploadError.message) ? "\n    → run supabase/polycards-word-audio.sql first" : "";
    throw new Error(`Upload: ${uploadError.message}${hint}`);
  }
  const { error: updateError } = await supabase
    .from('words')
    .update({ audio_path: path, audio_text: text, audio_voice: ENGINE })
    .eq('id', word.id);
  if (updateError) throw new Error(`Saving the row: ${updateError.message}`);
  // The old recording (Chirp, or a different text) isn't used any more.
  if (word.audio_path && word.audio_path !== path) {
    const { error } = await supabase.storage.from(AUDIO_BUCKET).remove([word.audio_path]);
    if (error) console.warn(`    (old file ${word.audio_path} not removed: ${error.message})`);
  }
  return { bytes: mp3.length, ...tokens };
}

const words = await fetchAllWords();
const summary = {
  read: words.length, skippedGemini: 0, skippedChirp: 0, empty: [], todo: [], notFound: [],
  recorded: 0, failed: [], bytes: 0, inputTokens: 0, audioTokens: 0,
};

const picking = options.words.length > 0;
if (picking) {
  for (const wanted of options.words) {
    const found = words.filter((w) => matchesWord(w, wanted));
    if (!found.length) summary.notFound.push(wanted);
    for (const word of found) {
      const text = recordingText(word);
      if (!text) summary.empty.push(word);
      else if (!summary.todo.some((t) => t.word.id === word.id)) summary.todo.push({ word, text });
    }
  }
} else {
  // A preview overwrites nothing, so old Chirp words are worth hearing too.
  const overwriteChirp = options.overwriteChirp || Boolean(options.preview);
  for (const word of words) {
    const text = recordingText(word);
    if (!text) { summary.empty.push(word); continue; }
    const plan = planWord(word, text, { overwriteChirp });
    if (plan === 'record') summary.todo.push({ word, text });
    else if (plan === 'skip-gemini') summary.skippedGemini++;
    else summary.skippedChirp++;
  }
}

const batch = summary.todo.slice(0, options.limit);
console.log(`${summary.read} words: ${summary.todo.length} to record${batch.length < summary.todo.length ? ` (this run: ${batch.length})` : ''}. Engine: ${ENGINE}`);
if (options.dryRun) console.log('Dry run: nothing is sent to Google and nothing is uploaded.\n');
else if (options.preview) {
  await mkdir(options.preview, { recursive: true });
  console.log(`Preview: MP3s go into ${options.preview}/ (nothing is uploaded, the database isn't changed).\n`);
}

for (const [i, { word, text }] of batch.entries()) {
  const label = `${String(i + 1).padStart(4)}. ${word.english}${text !== word.english ? `  →  "${text}"` : ''}`;
  if (options.dryRun) {
    console.log(`${label}   (${word.id})`);
    continue;
  }
  try {
    const result = await record(word, text);
    summary.recorded++;
    summary.bytes += result.bytes;
    summary.inputTokens += result.inputTokens;
    summary.audioTokens += result.audioTokens;
    console.log(`${label}   ✓ ${(result.bytes / 1024).toFixed(1)} KB`);
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

const dollars = (n) => `$${n.toFixed(n < 0.1 ? 4 : 2)}`;
console.log('\n--- Summary ---');
console.log(`Words read:            ${summary.read}`);
if (!picking) {
  console.log(`Skipped (Gemini, ok):  ${summary.skippedGemini}`);
  console.log(`Skipped (old Chirp):   ${summary.skippedChirp}${summary.skippedChirp ? '   (--overwrite-chirp to replace them)' : ''}`);
}
for (const wanted of summary.notFound) console.log(`Not found:             "${wanted}"`);
if (options.dryRun) {
  const guess = batch.reduce((sum, b) => {
    const g = guessTokens(b.text);
    return { inputTokens: sum.inputTokens + g.inputTokens, audioTokens: sum.audioTokens + g.audioTokens };
  }, { inputTokens: 0, audioTokens: 0 });
  console.log(`Would record:          ${batch.length}`);
  console.log(`Rough cost:            ${dollars(estimateCost(guess))} (about ${guess.inputTokens} input + ${guess.audioTokens} audio tokens)`);
} else {
  console.log(`Done:                  ${summary.recorded} (${(summary.bytes / 1024).toFixed(0)} KB)`);
  console.log(`Failed:                ${summary.failed.length}`);
  for (const { word, reason } of summary.failed) console.log(`  - ${word.english} (${word.id}): ${reason.split('\n')[0]}`);
  console.log(`Cost (estimate):       ${dollars(estimateCost(summary))} (${summary.inputTokens} input + ${summary.audioTokens} audio tokens)`);
}
if (summary.todo.length > batch.length) console.log(`Left for later:        ${summary.todo.length - batch.length} (--limit)`);
if (summary.empty.length) {
  console.log(`Skipped (no text):     ${summary.empty.length}`);
  for (const w of summary.empty) console.log(`  - "${w.english}" (${w.id}): set speak_as to record it`);
}
if (summary.failed.length || summary.notFound.length) process.exitCode = 1;
