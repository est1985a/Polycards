// Tests for the recording script's rules. Run with: npm test
import { describe, it, expect } from 'vitest';
import {
  VOICE, DEFAULT_DELAY_MS, recordingText, needsRecording, audioFileName, parseOptions, googleErrorHint, stopsTheRun,
} from './audioPlan.js';

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

describe('needsRecording', () => {
  const done = { audio_path: 'a-1.mp3', audio_text: 'already', audio_voice: VOICE };
  it('records new words, and words whose text or voice changed', () => {
    expect(needsRecording({ audio_path: null }, 'already')).toBe(true);
    expect(needsRecording(done, 'already')).toBe(false);
    expect(needsRecording(done, 'already!')).toBe(true);
    expect(needsRecording({ ...done, audio_voice: 'en-US-Other' }, 'already')).toBe(true);
  });
});

describe('audioFileName', () => {
  it('is the word id plus a hash that changes with the text or voice', () => {
    const name = audioFileName('abc', 'already');
    expect(name).toMatch(/^abc-[0-9a-f]{8}\.mp3$/);
    expect(audioFileName('abc', 'already')).toBe(name);
    expect(audioFileName('abc', 'already!')).not.toBe(name);
    expect(audioFileName('abc', 'already', 'en-US-Other')).not.toBe(name);
  });
});

describe('parseOptions', () => {
  it('reads --dry-run, --limit and --delay', () => {
    expect(parseOptions([])).toEqual({ dryRun: false, limit: Infinity, delayMs: DEFAULT_DELAY_MS });
    expect(parseOptions(['--dry-run', '--limit', '5', '--delay', '500'])).toEqual({ dryRun: true, limit: 5, delayMs: 500 });
  });

  it('refuses unknown options and bad numbers', () => {
    expect(() => parseOptions(['--limit'])).toThrow();
    expect(() => parseOptions(['--limit', 'ten'])).toThrow();
    expect(() => parseOptions(['--dryrun'])).toThrow();
  });
});

describe('Google errors', () => {
  it('gives a plain hint and stops the run for errors every word would get', () => {
    expect(googleErrorHint(400, 'API key not valid. Please pass a valid API key.')).toMatch(/GOOGLE_TTS_API_KEY/);
    expect(googleErrorHint(403, 'Cloud Text-to-Speech API has not been used in project 1 before or it is disabled.')).toMatch(/Turn on/);
    expect(googleErrorHint(429, 'Quota exceeded')).toMatch(/--delay/);
    expect(stopsTheRun(400, 'API key not valid.')).toBe(true);
    expect(stopsTheRun(403, '')).toBe(true);
    expect(stopsTheRun(500, 'Internal error')).toBe(false);
    expect(stopsTheRun(400, 'Input text is too long')).toBe(false);
  });
});
