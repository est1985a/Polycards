// Tests for the recording script's rules. Run with: npm test
import { describe, it, expect } from 'vitest';
import {
  ENGINE, VOICE, LANGUAGE, STYLE, MODEL, DEFAULT_DELAY_MS, PREVIEW_DIR, PREVIEW_LIMIT,
  recordingText, planWord, matchesWord, audioFileName, geminiUrl, geminiRequest, audioFromResponse,
  parseWav, encodeMp3, guessTokens, audioTokensFor, estimateCost, isRetryable, retryDelay,
  parseOptions, googleErrorHint, stopsTheRun,
} from './audioPlan.js';

// A small 16-bit PCM WAV, like the one Gemini sends back.
function makeWav(samples, { sampleRate = 24000, channels = 1, bits = 16, extra = false } = {}) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(v, i * 2));
  const fmt = Buffer.alloc(16);
  fmt.writeUInt16LE(1, 0);
  fmt.writeUInt16LE(channels, 2);
  fmt.writeUInt32LE(sampleRate, 4);
  fmt.writeUInt32LE(sampleRate * channels * 2, 8);
  fmt.writeUInt16LE(channels * 2, 12);
  fmt.writeUInt16LE(bits, 14);
  const chunk = (id, body) => {
    const h = Buffer.alloc(8);
    h.write(id, 0, 'ascii');
    h.writeUInt32LE(body.length, 4);
    return Buffer.concat([h, body, body.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]);
  };
  const parts = [chunk('fmt ', fmt), ...(extra ? [chunk('LIST', Buffer.from('abc'))] : []), chunk('data', data)];
  const body = Buffer.concat([Buffer.from('WAVE', 'ascii'), ...parts]);
  const riff = Buffer.alloc(8);
  riff.write('RIFF', 0, 'ascii');
  riff.writeUInt32LE(body.length, 4);
  return Buffer.concat([riff, body]);
}

describe('recordingText', () => {
  it('uses speak_as when set (trimmed), otherwise the cleaned English', () => {
    expect(recordingText({ english: 'How old ...?', speak_as: '  How old are you?  ' })).toBe('How old are you?');
    expect(recordingText({ english: 'How old ...?', speak_as: '   ' })).toBe('How old.');
    expect(recordingText({ english: 'enjoy ...ing', speak_as: null })).toBe('enjoy.');
    expect(recordingText({ english: 'already' })).toBe('already.');
    expect(recordingText({ english: '...' })).toBe('');
  });

  it('adds a full stop unless the text already ends in . ? or !', () => {
    expect(recordingText({ english: 'tiny' })).toBe('tiny.');
    expect(recordingText({ english: 'brown', speak_as: 'brown' })).toBe('brown.');
    expect(recordingText({ english: 'tiny', speak_as: 'tiny.' })).toBe('tiny.');
    expect(recordingText({ english: 'Hello!' })).toBe('Hello!');
    expect(recordingText({ english: 'Who', speak_as: 'Who are you?' })).toBe('Who are you?');
    expect(recordingText({ english: 'Mr.' })).toBe('Mr.');
    expect(recordingText({ english: 'tiny', speak_as: '  tiny  ' })).toBe('tiny.');
  });
});

describe('recordingText (Gemini notes)', () => {
  it('drops ... / … from stub entries, trims, and keeps question marks', () => {
    expect(recordingText({ english: 'one of ...' })).toBe('one of.');
    expect(recordingText({ english: '  one of …  ' })).toBe('one of.');
    expect(recordingText({ english: 'How about you?' })).toBe('How about you?');
  });
});

describe('planWord', () => {
  const gemini = { audio_path: 'a-1.mp3', audio_text: 'dog.', audio_voice: ENGINE };
  const chirp = { audio_path: 'a-0.mp3', audio_text: 'dog.', audio_voice: 'en-US-Chirp3-HD-Achird' };
  it('records new words and words whose text changed', () => {
    expect(planWord({ audio_path: null }, 'dog.')).toBe('record');
    expect(planWord(gemini, 'dogs.')).toBe('record');
    expect(planWord(chirp, 'dogs.')).toBe('record');
  });
  it('skips Gemini clips, and Chirp clips unless overwriteChirp', () => {
    expect(planWord(gemini, 'dog.')).toBe('skip-gemini');
    expect(planWord(gemini, 'dog.', { overwriteChirp: true })).toBe('skip-gemini');
    expect(planWord(chirp, 'dog.')).toBe('skip-chirp');
    expect(planWord(chirp, 'dog.', { overwriteChirp: true })).toBe('record');
  });
  it('records a different Gemini voice, and any word picked by name', () => {
    expect(planWord({ ...gemini, audio_voice: 'gemini-3.8-flash-tts/Kore' }, 'dog.')).toBe('record');
    expect(planWord(gemini, 'dog.', { picked: true })).toBe('record');
  });
});

describe('matchesWord', () => {
  it('matches the English or speak_as, ignoring case and spaces', () => {
    expect(matchesWord({ english: 'Dog' }, ' dog ')).toBe(true);
    expect(matchesWord({ english: 'How old ...?', speak_as: 'How old are you?' }, 'how old are  you?')).toBe(true);
    expect(matchesWord({ english: 'How old ...?' }, 'how old ...?')).toBe(true);
    expect(matchesWord({ english: 'dogs' }, 'dog')).toBe(false);
    expect(matchesWord({ english: 'dog' }, '  ')).toBe(false);
  });
});

describe('audioFileName', () => {
  it('is the word id plus a hash that changes with the text, engine or style', () => {
    const name = audioFileName('abc', 'already');
    expect(name).toMatch(/^abc-[0-9a-f]{8}\.mp3$/);
    expect(audioFileName('abc', 'already')).toBe(name);
    expect(audioFileName('abc', 'already!')).not.toBe(name);
    expect(audioFileName('abc', 'already', 'gemini-x/Kore')).not.toBe(name);
    expect(audioFileName('abc', 'already', ENGINE, 'Say it fast.')).not.toBe(name);
  });
});

describe('geminiRequest', () => {
  it('puts the text alone in the part and the style only in speechMetadata', () => {
    const body = geminiRequest('How about you?');
    const part = body.contents[0].parts[0];
    expect(body.contents[0].role).toBe('user');
    expect(part.text).toBe('How about you?');
    expect(part.speechMetadata.style).toBe(STYLE);
    expect(JSON.stringify(body.contents[0].parts.map((p) => p.text))).not.toContain('slower');
  });
  it('asks for audio in the Achird voice, American English', () => {
    const { generationConfig } = geminiRequest('dog.');
    expect(generationConfig.responseModalities).toEqual(['AUDIO']);
    expect(generationConfig.speechConfig.voiceConfig.voice).toBe(VOICE);
    expect(generationConfig.speechConfig.languageCode).toBe(LANGUAGE);
    expect(VOICE).toBe('Achird');
    expect(ENGINE).toBe('gemini-3.8-flash-tts/Achird');
  });
  it('calls the global endpoint of the project', () => {
    expect(geminiUrl('polycards-123')).toBe(`https://aiplatform.googleapis.com/v1/projects/polycards-123/locations/global/publishers/google/models/${MODEL}:generateContent`);
  });
  it('finds the audio in camelCase or snake_case answers', () => {
    expect(audioFromResponse({ candidates: [{ content: { parts: [{ inlineData: { data: 'QQ==' } }] } }] })).toBe('QQ==');
    expect(audioFromResponse({ candidates: [{ content: { parts: [{ inline_data: { data: 'Qg==' } }] } }] })).toBe('Qg==');
    expect(audioFromResponse({})).toBe(null);
  });
});

describe('parseWav and encodeMp3', () => {
  it('reads mono 16-bit PCM, skipping other chunks', () => {
    const wav = parseWav(makeWav([0, 1000, -1000, 32767], { extra: true }));
    expect(wav.sampleRate).toBe(24000);
    expect(Array.from(wav.samples)).toEqual([0, 1000, -1000, 32767]);
    expect(wav.seconds).toBeCloseTo(4 / 24000);
  });
  it('mixes stereo down to mono', () => {
    expect(Array.from(parseWav(makeWav([100, 300, -200, -400], { channels: 2 })).samples)).toEqual([200, -300]);
  });
  it('refuses files that are not 16-bit PCM WAV', () => {
    expect(() => parseWav(Buffer.from('not a wav file at all'))).toThrow(/not a WAV/);
    expect(() => parseWav(makeWav([1, 2], { bits: 8 }))).toThrow(/16-bit/);
  });
  it('makes an MP3 (frame sync at the start)', () => {
    const samples = new Int16Array(24000).map((_, i) => Math.round(8000 * Math.sin(i / 10)));
    const mp3 = encodeMp3(samples, 24000);
    expect(mp3.length).toBeGreaterThan(1000);
    expect(mp3.length).toBeLessThan(12000);
    expect(mp3[0]).toBe(0xff);
    expect(mp3[1] & 0xe0).toBe(0xe0);
  });
});

describe('cost estimate', () => {
  it('uses $0.50 per 1M input tokens and $9.00 per 1M audio tokens, 25 audio tokens a second', () => {
    expect(audioTokensFor(2)).toBe(50);
    expect(estimateCost({ inputTokens: 1_000_000, audioTokens: 0 })).toBeCloseTo(0.5);
    expect(estimateCost({ inputTokens: 0, audioTokens: 1_000_000 })).toBeCloseTo(9);
    const guess = guessTokens('dog.');
    expect(guess.inputTokens).toBeGreaterThan(STYLE.length / 4);
    expect(estimateCost(guess)).toBeLessThan(0.001);
  });
});

describe('retries', () => {
  it('retries rate limits and server errors only', () => {
    expect(isRetryable(429)).toBe(true);
    expect(isRetryable(503)).toBe(true);
    expect(isRetryable(400, 'RESOURCE_EXHAUSTED quota')).toBe(true);
    expect(isRetryable(400, 'bad voice')).toBe(false);
    expect(isRetryable(403)).toBe(false);
  });
  it('waits 2, 4, 8, 16 s, or what Google asks for (at most a minute)', () => {
    expect([0, 1, 2, 3].map((a) => retryDelay(a))).toEqual([2000, 4000, 8000, 16000]);
    expect(retryDelay(0, '5')).toBe(5000);
    expect(retryDelay(0, '600')).toBe(60000);
    expect(retryDelay(1, 'soon')).toBe(4000);
  });
});

describe('parseOptions', () => {
  const base = { dryRun: false, limit: Infinity, delayMs: DEFAULT_DELAY_MS, preview: null, words: [], overwriteChirp: false };
  it('reads --dry-run, --limit and --delay', () => {
    expect(parseOptions([])).toEqual(base);
    expect(parseOptions(['--dry-run', '--limit', '5', '--delay', '500'])).toEqual({ ...base, dryRun: true, limit: 5, delayMs: 500 });
  });
  it('reads --preview (10 words unless told otherwise), --word and --overwrite-chirp', () => {
    expect(parseOptions(['--preview'])).toEqual({ ...base, preview: PREVIEW_DIR, limit: PREVIEW_LIMIT });
    expect(parseOptions(['--preview', 'mine', '--limit', '3'])).toEqual({ ...base, preview: 'mine', limit: 3 });
    expect(parseOptions(['--preview', '--word', 'dog', '--word', 'How about you?'])).toEqual({ ...base, preview: PREVIEW_DIR, words: ['dog', 'How about you?'] });
    expect(parseOptions(['--overwrite-chirp'])).toEqual({ ...base, overwriteChirp: true });
  });
  it('refuses unknown options and bad values', () => {
    expect(() => parseOptions(['--limit'])).toThrow();
    expect(() => parseOptions(['--limit', 'ten'])).toThrow();
    expect(() => parseOptions(['--dryrun'])).toThrow();
    expect(() => parseOptions(['--word'])).toThrow();
    expect(() => parseOptions(['--word', '--dry-run'])).toThrow();
  });
});

describe('Google errors', () => {
  it('gives a plain hint and stops the run for errors every word would get', () => {
    expect(googleErrorHint(401, 'Could not load the default credentials.')).toMatch(/GOOGLE_APPLICATION_CREDENTIALS/);
    expect(googleErrorHint(403, 'Vertex AI API has not been used in project 1 before or it is disabled.')).toMatch(/Gemini Enterprise API/);
    expect(googleErrorHint(403, 'Permission denied')).toMatch(/Vertex AI User/);
    expect(googleErrorHint(404, 'Not found')).toMatch(/GOOGLE_CLOUD_PROJECT/);
    expect(googleErrorHint(429, 'Quota exceeded')).toMatch(/--delay/);
    expect(stopsTheRun(401, '')).toBe(true);
    expect(stopsTheRun(403, '')).toBe(true);
    expect(stopsTheRun(404, '')).toBe(true);
    expect(stopsTheRun(400, 'Invalid voice name')).toBe(true);
    expect(stopsTheRun(500, 'Internal error')).toBe(false);
    expect(stopsTheRun(400, 'Input text is too long')).toBe(false);
  });
});
