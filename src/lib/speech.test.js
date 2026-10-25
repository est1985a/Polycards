// Tests for pronunciation (speech.js). Run with: npm test
import { describe, it, expect, vi } from 'vitest';
import { speechText, speechAvailable, speakWord, stopSpeaking, SLOW_RATE } from './speech';

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
    expect(calls[0]).toBe('cancel');
    expect(calls[1].text).toBe('Call me');
    expect(calls[1].lang).toBe('en-US');
    expect(calls[1].rate).toBe(1);
    expect(calls[1].voice).toBeUndefined(); // empty voice list: the default voice
  });

  it('uses the slow rate when asked', () => {
    const { win, calls } = fakeWindow();
    speakWord('already', { slow: true }, win);
    expect(calls[1].rate).toBe(SLOW_RATE);
  });

  it('uses Samantha only when she is listed, never the first en-US voice', () => {
    const odd = { name: 'Whisper', lang: 'en-US' };
    const samantha = { name: 'Samantha', lang: 'en-US' };
    const a = fakeWindow([odd]);
    speakWord('already', {}, a.win);
    expect(a.calls[1].voice).toBeUndefined();
    const b = fakeWindow([odd, samantha]);
    speakWord('already', {}, b.win);
    expect(b.calls[1].voice).toBe(samantha);
  });

  it('does nothing for empty text', () => {
    const { win, calls } = fakeWindow();
    speakWord('...', {}, win);
    expect(calls).toEqual([]);
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
