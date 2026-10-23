// Tests for the answer area under the study card and what each review answer sends. Run with: npm test
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnswerArea, TypingArea } from './StudySession';
import { srsAnswer, newSessionId, saveErrorReporter } from '../lib/srs';

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
    expect(srsAnswer(2, 'got_it', 0)).toEqual({
      result: 'got_it', wrongs: 0, label: 'Lv 3!', mastered: false, again: false, spellingBonus: false,
    });
  });

  it('sends not_yet for まだ, counts the miss and brings the card back', () => {
    expect(srsAnswer(2, 'not_yet', 0)).toEqual({
      result: 'not_yet', wrongs: 1, label: null, mastered: false, again: true, spellingBonus: false,
    });
    expect(srsAnswer(2, 'not_yet', 1).wrongs).toBe(2);
  });

  it('sends dont_know for わからない and counts it as a miss, like まだ', () => {
    expect(srsAnswer(2, 'dont_know', 0)).toEqual({
      result: 'dont_know', wrongs: 1, label: null, mastered: false, again: true, spellingBonus: false,
    });
  });

  it('still sends got_it for わかった on a card missed earlier, with no float', () => {
    expect(srsAnswer(2, 'got_it', 1)).toEqual({
      result: 'got_it', wrongs: 1, label: null, mastered: false, again: false, spellingBonus: false,
    });
  });

  it('shows Mastered! when a Lv 7 card is answered correctly', () => {
    expect(srsAnswer(7, 'got_it', 0)).toMatchObject({ result: 'got_it', label: 'Mastered!', mastered: true });
  });

  it('shows +1 スペル only for a correct spelling on a card not missed this session', () => {
    expect(srsAnswer(2, 'got_it', 0, 'exact')).toMatchObject({ label: 'Lv 3!', spellingBonus: true });
    expect(srsAnswer(2, 'got_it', 1, 'exact').spellingBonus).toBe(false);
    expect(srsAnswer(2, 'got_it', 0, 'close').spellingBonus).toBe(false);
    expect(srsAnswer(2, 'not_yet', 0, 'wrong').spellingBonus).toBe(false);
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

describe('save errors (saveErrorReporter)', () => {
  it('shows the pop-up only once per review session', () => {
    const show = vi.fn();
    const report = saveErrorReporter(show);
    report(new Error('保存できませんでした'));
    report(new Error('保存できませんでした'));
    report(new Error('ログインしてください'));
    expect(show).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledWith('保存できませんでした');
  });

  it('shows it again in the next review session', () => {
    const show = vi.fn();
    saveErrorReporter(show)(new Error('a'));
    saveErrorReporter(show)(new Error('b'));
    expect(show).toHaveBeenCalledTimes(2);
  });
});

describe('typing mode (TypingArea)', () => {
  const render = (props) => renderToStaticMarkup(
    <TypingArea
      phase="typing" typed="" answer="apple" onTypedChange={() => {}} onSubmit={() => {}} onDontKnow={() => {}}
      onNext={() => {}} onAnswer={() => {}} answerSize={{ minHeight: 52 }} {...props}
    />
  );

  it('shows a text box set up for English, 答える and わからない instead of 答えを見る', () => {
    const html = render();
    expect(html).toContain('<input');
    for (const attr of ['autoComplete="off"', 'autoCorrect="off"', 'autoCapitalize="none"', 'spellCheck="false"', 'lang="en"']) {
      expect(html).toContain(attr);
    }
    expect(html).toContain('答える');
    expect(html).toContain('わからない');
    expect(html).not.toContain('答えを見る');
  });

  it('disables 答える while the box is empty', () => {
    expect(render({ typed: '' })).toMatch(/<button type="submit" disabled=""/);
    expect(render({ typed: '  ' })).toMatch(/<button type="submit" disabled=""/);
    expect(render({ typed: 'apple' })).not.toMatch(/<button type="submit" disabled=""/);
  });

  it('a correct spelling: ✓ 正解！ and 次へ, no まだ / わかった', () => {
    const html = render({ phase: 'next', typed: 'apple', spelling: 'exact' });
    expect(html).toContain('✓ 正解！');
    expect(html).toContain('次へ');
    expect(html).not.toContain('まだ');
    expect(html).not.toContain('<input');
  });

  it('an alternate answer: the gold 教科書の答え line under ✓ 正解！, only when given', () => {
    const html = render({ phase: 'next', typed: 'cute', spelling: 'exact', textbookAnswer: 'pretty' });
    expect(html).toContain('✓ 正解！');
    expect(html).toContain('教科書の答え: <span lang="en"');
    expect(html).toContain('pretty');
    expect(render({ phase: 'next', typed: 'pretty', spelling: 'exact' })).not.toContain('教科書の答え');
    expect(render({ phase: 'next', spelling: null, textbookAnswer: 'pretty' })).not.toContain('教科書の答え');
  });

  it("an alternate answer: the student's answer (lighter, lang en) before ✓ 正解！, only when given", () => {
    const html = render({ phase: 'next', typed: 'huge', spelling: 'exact', textbookAnswer: 'big', alternateAnswer: 'huge' });
    expect(html).toContain('<span lang="en" style="font-weight:400">huge</span> ✓ 正解！');
    expect(html.indexOf('正解')).toBeLessThan(html.indexOf('教科書の答え'));
    const main = render({ phase: 'next', typed: 'big', spelling: 'exact' });
    expect(main).not.toContain('font-weight:400');
    expect(main).toContain('✓ 正解！');
  });

  it('わからない: only 次へ', () => {
    const html = render({ phase: 'next', spelling: null });
    expect(html).toContain('次へ');
    expect(html).not.toContain('正解');
  });

  it('one letter off: おしい！, what they typed, the right answer, then まだ / わかった', () => {
    const html = render({ phase: 'choose', typed: 'aple', spelling: 'close' });
    expect(html).toContain('おしい！');
    expect(html).toContain('あなたの答え: <span lang="en" style="font-weight:700">aple</span>');
    expect(html).toContain('apple');
    expect(html).toContain('まだ');
    expect(html).toContain('わかった');
    expect(html).toContain('まだでも大丈夫！すぐにまた出てきます');
  });

  it('wrong: the same without おしい！', () => {
    const html = render({ phase: 'choose', typed: 'banana', spelling: 'wrong' });
    expect(html).not.toContain('おしい');
    expect(html).toContain('banana');
    expect(html).toContain('正しい答え');
    expect(html).toContain('わかった');
  });

  const RETRY_NOTE = 'それも正しい意味ですが、この単語ではありません。もう一度！';

  it('while checking another meaning: 答える shows 確認中… and is disabled', () => {
    const html = render({ typed: 'from', checking: true });
    expect(html).toContain('確認中…');
    expect(html).not.toContain('>答える<');
    expect(html).toMatch(/<button type="submit" disabled=""/);
  });

  it('another word with the same meaning: the gold note, the box again, no answer shown', () => {
    const html = render({ typed: '', retryNote: true });
    expect(html).toContain(RETRY_NOTE);
    expect(html).toContain('<input');
    expect(html).toContain('答える');
    expect(html).not.toContain('正しい答え');
    expect(html).not.toContain('apple');
  });

  it('no note before a retry', () => {
    expect(render()).not.toContain(RETRY_NOTE);
  });
});
