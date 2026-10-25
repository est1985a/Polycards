// Tests for pronunciation (speech.js). Run with: npm test
import { describe, it, expect, vi } from 'vitest';
import { speechText, speechAvailable, speakWord, stopSpeaking, wordAudioUrl, SLOW_RATE } from './speech';

// A fake browser: records what was cancelled and spoken.
function fakeWindow(voices = []) {
  const calls = [];
  const win = {
    speechSynthesis: {
      cancel: () => calls.push('cancel'),
      speak: (u) => calls.push(u),
      getVoices: () => voices,
    },
    SpeechSynthesisUtterance: function (text) { this.text = text; },
  };
  return { win, calls };
}

describe('speechText', () => {
  it('leaves plain words and sentences alone', () => {
    expect(speechText('already')).toBe('already');
    expect(speechText('Hello.')).toBe('Hello.');
    expect(speechText("I'm fine.")).toBe("I'm fine.");
    expect(speechText('How are you?')).toBe('How are you?');
    expect(speechText('T-shirt')).toBe('T-shirt');
    expect(speechText('café')).toBe('café');
  });

  it('removes ..., …, ～ and ~ placeholders', () => {
    expect(speechText('Call me ...')).toBe('Call me');
    expect(speechText('one of …')).toBe('one of');
    expect(speechText('be good at ～')).toBe('be good at');
    expect(speechText('make ... from ~')).toBe('make from');
    expect(speechText('help ... with ~')).toBe('help with');
    expect(speechText('name ... after ~')).toBe('name after');
  });

  it('keeps only the first of two forms', () => {
    expect(speechText('cut ... down / cut down ...')).toBe('cut down');
    expect(speechText('throw ... away / throw away ...')).toBe('throw away');
  });

  it('removes [ ] and ( ) with what is inside', () => {
    expect(speechText('have never [not] been to')).toBe('have never been to');
    expect(speechText('there is [are] ...')).toBe('there is');
    expect(speechText('Thank you [Thanks] for ....')).toBe('Thank you for');
    expect(speechText("on one's way (to ...)")).toBe("on one's way");
    expect(speechText('... kind(s) of ~')).toBe('kind of');
  });

  it('removes punctuation right after a placeholder, and an attached "ing"', () => {
    expect(speechText('How old ...?')).toBe('How old');
    expect(speechText('How many ...?')).toBe('How many');
    expect(speechText("Why don't we ...?")).toBe("Why don't we");
    expect(speechText('Here is ....')).toBe('Here is');
    expect(speechText('enjoy ...ing')).toBe('enjoy');
    expect(speechText('go ...ing')).toBe('go');
    expect(speechText('like ...ing')).toBe('like');
    expect(speechText('... years old')).toBe('years old');
    expect(speechText('cheer ... up')).toBe('cheer up');
  });

  it('gives empty text for nothing', () => {
    expect(speechText('')).toBe('');
    expect(speechText(null)).toBe('');
    expect(speechText('...')).toBe('');
  });
});

describe('speakWord', () => {
  it('cancels first, then speaks the cleaned word in en-US at the normal rate', () => {
    const { win, calls } = fakeWindow();
    speakWord('Call me ...', {}, win);
    const u = calls.at(-1);
    expect(calls.slice(0, -1)).toContain('cancel'); // cancelled before speaking
    expect(u.text).toBe('Call me');
    expect(u.lang).toBe('en-US');
    expect(u.rate).toBe(1);
    expect(u.voice).toBeUndefined(); // empty voice list: the default voice
  });

  it('uses the slow rate when asked', () => {
    const { win, calls } = fakeWindow();
    speakWord('already', { slow: true }, win);
    expect(calls.at(-1).rate).toBe(SLOW_RATE);
  });

  it('uses Samantha only when she is listed, never the first en-US voice', () => {
    const odd = { name: 'Whisper', lang: 'en-US' };
    const samantha = { name: 'Samantha', lang: 'en-US' };
    const a = fakeWindow([odd]);
    speakWord('already', {}, a.win);
    expect(a.calls.at(-1).voice).toBeUndefined();
    const b = fakeWindow([odd, samantha]);
    speakWord('already', {}, b.win);
    expect(b.calls.at(-1).voice).toBe(samantha);
  });

  it('does nothing for empty text', () => {
    const { win, calls } = fakeWindow();
    speakWord('...', {}, win);
    expect(calls.filter((c) => c !== 'cancel')).toEqual([]);
  });

  it('never throws, with no speech or a broken one', () => {
    expect(() => speakWord('already', {}, {})).not.toThrow();
    expect(() => speakWord('already', {}, undefined)).not.toThrow();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { win } = fakeWindow();
    win.speechSynthesis.speak = () => { throw new Error('not allowed'); };
    expect(() => speakWord('already', {}, win)).not.toThrow();
    warn.mockRestore();
    expect(() => stopSpeaking({})).not.toThrow();
  });
});

describe('speechAvailable', () => {
  it('is true only with speechSynthesis and SpeechSynthesisUtterance', () => {
    expect(speechAvailable(fakeWindow().win)).toBe(true);
    expect(speechAvailable({ speechSynthesis: {} })).toBe(false);
    expect(speechAvailable({})).toBe(false);
    expect(speechAvailable(undefined)).toBe(false);
  });
});

// A fake browser with an Audio element: play() resolves or rejects as asked.
function audioWindow(playResult = () => Promise.resolve()) {
  const { win, calls } = fakeWindow();
  const audios = [];
  win.Audio = function () {
    this.paused = 0;
    this.play = () => { calls.push(`play ${this.src}`); return playResult(this); };
    this.pause = () => { this.paused++; };
    audios.push(this);
  };
  return { win, calls, audios };
}
const spoken = (calls) => calls.filter((c) => typeof c === 'object').map((u) => u.text);
const quietWarn = () => vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('recorded audio', () => {
  it('builds the public file URL', () => {
    expect(wordAudioUrl('abc-1234.mp3', 'https://x.supabase.co'))
      .toBe('https://x.supabase.co/storage/v1/object/public/word-audio/abc-1234.mp3');
  });

  it('plays the file (not the built-in voice) through one reused element', async () => {
    const { win, calls, audios } = audioWindow();
    speakWord('already', { audioPath: 'a.mp3' }, win);
    speakWord('again', { audioPath: 'b.mp3' }, win);
    await Promise.resolve();
    expect(audios).toHaveLength(1);
    expect(calls.filter((c) => typeof c === 'string' && c.startsWith('play'))).toEqual([
      `play ${wordAudioUrl('a.mp3')}`, `play ${wordAudioUrl('b.mp3')}`,
    ]);
    expect(spoken(calls)).toEqual([]);
    expect(audios[0].playbackRate).toBe(1);
  });

  it('slow: rate 0.75 with a natural pitch', () => {
    const { win, audios } = audioWindow();
    speakWord('already', { slow: true, audioPath: 'a.mp3' }, win);
    expect(audios[0].playbackRate).toBe(SLOW_RATE);
    expect(audios[0].defaultPlaybackRate).toBe(SLOW_RATE);
    expect(audios[0].preservesPitch).toBe(true);
  });

  it('a file that fails to load falls back to the built-in voice, once', async () => {
    const warn = quietWarn();
    const { win, calls, audios } = audioWindow(() => Promise.reject(Object.assign(new Error('404'), { name: 'NotSupportedError' })));
    speakWord('Call me ...', { slow: true, audioPath: 'missing.mp3' }, win);
    audios[0].onerror();
    await new Promise((r) => setTimeout(r, 0));
    expect(spoken(calls)).toEqual(['Call me']);
    expect(calls.filter((c) => typeof c === 'object')[0].rate).toBe(SLOW_RATE);
    warn.mockRestore();
  });

  it('stays quiet when iOS blocks a play without a tap', async () => {
    const { win, calls } = audioWindow(() => Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' })));
    speakWord('already', { audioPath: 'a.mp3' }, win);
    await new Promise((r) => setTimeout(r, 0));
    expect(spoken(calls)).toEqual([]);
  });

  it('a late error from an earlier word never speaks over the current one', async () => {
    const warn = quietWarn();
    const { win, calls, audios } = audioWindow();
    speakWord('first', { audioPath: 'a.mp3' }, win);
    const firstError = audios[0].onerror;
    speakWord('second', { audioPath: 'b.mp3' }, win);
    firstError();
    stopSpeaking(win);
    audios[0].onerror(); // the second word's error after a stop
    await Promise.resolve();
    expect(spoken(calls)).toEqual([]);
    expect(audios[0].paused).toBeGreaterThan(0);
    warn.mockRestore();
  });

  it('no file: the built-in voice, as before', () => {
    const { win, calls, audios } = audioWindow();
    speakWord('already', { audioPath: null }, win);
    expect(audios).toHaveLength(0);
    expect(spoken(calls)).toEqual(['already']);
  });
});

