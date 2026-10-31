// Tests for the answer area under the study card and what each review answer sends. Run with: npm test
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import StudySession, { AnswerArea, TypingArea, PreviousCardChip, ContinueReview } from './StudySession';
import { makeUndo, takeSnapshot } from '../lib/undo';
import { setLang } from '../i18n';
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

describe('previous card chip (PreviousCardChip)', () => {
  afterEach(() => setLang('ja'));
  const undoFor = (knew) => makeUndo(takeSnapshot({ pile: [], counts: {}, wrongCounts: {}, clearedCount: 0, typed: '', typedResult: null, retryUsed: false }), { id: 'w1-e2j', front: 'take out the garbage' }, knew);
  const render = (props) => renderToStaticMarkup(<PreviousCardChip onUndo={() => {}} {...props} />);

  it('shows the last card, ✓ わかった in accentText and the undo button', () => {
    const html = render({ undo: undoFor(true) });
    expect(html).toContain('前のカード');
    expect(html).toContain('take out the garbage');
    expect(html).toContain('✓ わかった');
    expect(html).toContain('var(--accentText)');
    expect(html).toContain('元に戻す');
    expect(html).toContain('aria-label="前のカードの答えを元に戻す"');
    expect(html).toContain('min-height:44px');
  });

  it('shows まだ in danger, with no tick', () => {
    const html = render({ undo: undoFor(false) });
    expect(html).toContain('まだ');
    expect(html).not.toContain('✓');
    expect(html).toContain('var(--danger)');
  });

  it('beside the card: centered, word cut to 3 lines, fixed-width button that is still 44 px tall', () => {
    const html = render({ undo: undoFor(true), side: true });
    expect(html).toContain('text-align:center');
    expect(html).toContain('overflow-wrap:anywhere');
    expect(html).toContain('-webkit-line-clamp:3');
    expect(html).toContain('width:96px');
    expect(html).toContain('min-height:44px');
  });

  it('in the row above the card: word cut to 1 line, button not fixed-width', () => {
    const html = render({ undo: undoFor(false) });
    expect(html).toContain('-webkit-line-clamp:1');
    expect(html).toContain('overflow-wrap:anywhere');
    expect(html).not.toContain('width:96px');
  });

  it('uses the English button text in English mode', () => {
    setLang('en');
    const html = render({ undo: undoFor(true) });
    expect(html).toContain('Last card');
    expect(html).toContain('✓ I knew it');
    expect(html).toContain('>Undo<');
    expect(html).toContain('aria-label="Undo your answer to the last card"');
  });
});

describe('review top row', () => {
  const cards = [
    { id: 'w1-jp2en', wordId: 'w1', direction: 'jp2en', front: '犬', back: 'dog', en: 'dog', level: 1, altAnswers: [] },
    { id: 'w1-en2jp', wordId: 'w1', direction: 'en2jp', front: 'dog', back: '犬', en: 'dog', level: 1, altAnswers: [] },
  ];
  const session = (props) => renderToStaticMarkup(
    <StudySession activeSet={{ id: 'review', name: '復習', cards, mode: 'srs' }} onBack={() => {}} onAnswerModeChange={() => {}} {...props} />
  );

  it('SRS: back button, name, progress and the 答え方 toggle', () => {
    const html = session();
    expect(html).toContain('class="back-button"');
    expect(html).toContain('>マイデッキにもどる</span>');
    expect(html).toContain('復習');
    expect(html).toContain('覚えた: 0 ・ 残り: 2');
    expect(html).toContain('aria-label="答え方"');
  });

  it('the toggle shows even when every card is English → Japanese', () => {
    const html = renderToStaticMarkup(
      <StudySession activeSet={{ id: 'review', name: '復習', cards: [cards[1]], mode: 'srs' }} onBack={() => {}} onAnswerModeChange={() => {}} />
    );
    expect(html).toContain('aria-label="答え方"');
  });

  it('the Card Sets drill has the back button but no toggle', () => {
    const html = renderToStaticMarkup(
      <StudySession activeSet={{ id: 'd1', name: 'Unit 1', cards, ownedWordIds: null }} onBack={() => {}} onAnswerModeChange={() => {}} />
    );
    expect(html).toContain('class="back-button"');
    expect(html).not.toContain('aria-label="答え方"');
  });

  it('自動再生 switch: only when the browser can speak, in the review and the drill', () => {
    const speech = { autoPlay: true, slow: false };
    expect(session({ speech, onAutoPlayChange: () => {} })).toMatch(/role="switch" aria-checked="true" aria-label="自動再生"/);
    expect(session({ speech: { ...speech, autoPlay: false }, onAutoPlayChange: () => {} })).toContain('aria-checked="false" aria-label="自動再生"');
    expect(session({ speech: null, onAutoPlayChange: () => {} })).not.toContain('自動再生');
    expect(session({ speech })).not.toContain('自動再生'); // no handler: no switch
    const drill = renderToStaticMarkup(
      <StudySession activeSet={{ id: 'd1', name: 'Unit 1', cards, ownedWordIds: null }} onBack={() => {}} speech={speech} onAutoPlayChange={() => {}} />
    );
    expect(drill).toContain('aria-label="自動再生"');
  });

  it('fit: a flex column; the card slot shrinks between its limits', () => {
    const html = session({ fit: true, wide: true });
    expect(html).toContain('flex-direction:column');
    expect(html).toContain('max-height:420px');
    expect(html).toContain('min-height:240px');
    expect(session({ fit: true, wide: true, short: true })).toContain('min-height:200px');
    expect(session()).not.toContain('max-height:420px'); // not fitted: unchanged
  });
});

describe('全部クリア panel: continue reviewing (ContinueReview)', () => {
  const panel = (props) => renderToStaticMarkup(<ContinueReview sessionSize={20} onContinue={() => {}} {...props} />);

  it('more cards due: the real total and a button for the next set (at most the session size)', () => {
    const html = panel({ moreDue: 45 });
    expect(html).toContain('いま復習できるカード：全45枚');
    expect(html).toContain('続けて復習する（20枚）');
  });

  it('fewer due than the session size: the button says how many', () => {
    expect(panel({ moreDue: 7 })).toContain('続けて復習する（7枚）');
  });

  it('nothing due: a calm line and no button', () => {
    const html = panel({ moreDue: 0 });
    expect(html).toContain('今は復習するカードはありません');
    expect(html).not.toContain('<button');
  });

  it('still counting: an empty space of the same height, no text', () => {
    const html = panel({ moreDue: undefined });
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('<button');
  });

  it('count failed: nothing', () => {
    expect(panel({ moreDue: null })).toBe('');
  });

  it('busy: the button is disabled', () => {
    expect(panel({ moreDue: 5, busy: true })).toContain('disabled=""');
  });

  it('English (DRAFT wording)', () => {
    setLang('en');
    try {
      expect(panel({ moreDue: 45 })).toContain('Cards to review now: 45');
      expect(panel({ moreDue: 45 })).toContain('Keep reviewing (20)');
      expect(panel({ moreDue: 0 })).toContain('Nothing to review right now');
    } finally {
      setLang('ja');
    }
  });
});
