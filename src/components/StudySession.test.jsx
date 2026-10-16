// Tests for the answer area under the study card and what each review answer sends. Run with: npm test
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnswerArea } from './StudySession';
import { srsAnswer, newSessionId } from '../lib/srs';

const NOTE = 'まだでも大丈夫！すぐにまた出てきます';
const render = (props) => renderToStaticMarkup(
  <AnswerArea revealed={false} onReveal={() => {}} onAnswer={() => {}} answerSize={{ minHeight: 52 }} {...props} />
);

describe('AnswerArea', () => {
  it('shows only 答えを見る before the card is flipped', () => {
    const html = render();
    expect(html).toContain('答えを見る');
    expect(html).not.toContain(NOTE);
  });

  it('shows the answer buttons and the reassuring note after revealing', () => {
    const html = render({ revealed: true });
    expect(html).toContain('まだ');
    expect(html).toContain('わかった');
    expect(html).toContain(NOTE);
    expect(html).not.toContain('答えを見る');
  });
});

describe('one SRS answer (srsAnswer)', () => {
  it('sends got_it for わかった and shows the level-up float', () => {
    expect(srsAnswer(2, true, 0)).toEqual({ result: 'got_it', wrongs: 0, label: 'Lv 3!', mastered: false, again: false });
  });

  it('sends not_yet for まだ, counts the miss and brings the card back', () => {
    expect(srsAnswer(2, false, 0)).toEqual({ result: 'not_yet', wrongs: 1, label: null, mastered: false, again: true });
    expect(srsAnswer(2, false, 1).wrongs).toBe(2);
  });

  it('still sends got_it for わかった on a card missed earlier, with no float', () => {
    expect(srsAnswer(2, true, 1)).toEqual({ result: 'got_it', wrongs: 1, label: null, mastered: false, again: false });
  });

  it('shows Mastered! when a Lv 7 card is answered correctly', () => {
    expect(srsAnswer(7, true, 0)).toMatchObject({ result: 'got_it', label: 'Mastered!', mastered: true });
  });
});

describe('review session id (newSessionId)', () => {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it('makes a new UUID each time', () => {
    const a = newSessionId();
    expect(a).toMatch(UUID);
    expect(newSessionId()).not.toBe(a);
  });

  it('still makes a valid UUID in browsers without crypto.randomUUID', () => {
    const real = globalThis.crypto;
    try {
      vi.stubGlobal('crypto', { getRandomValues: (b) => real.getRandomValues(b) });
      expect(newSessionId()).toMatch(UUID);
      vi.stubGlobal('crypto', undefined);
      expect(newSessionId()).toMatch(UUID);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
