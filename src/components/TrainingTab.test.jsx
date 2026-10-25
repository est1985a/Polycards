// Tests for the Training tab's menu and the ABCを書こう page (static render; the pen and the model
// can't run here). Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import TrainingTab from './TrainingTab';
import AbcPractice from './AbcPractice';
import Tabs from './Tabs';
import { DonePanel } from '../handwriting/LetterPractice.jsx';
import { HW_COLORS } from '../handwriting/config.js';

const abc = (path, done = new Set()) => renderToStaticMarkup(
  <AbcPractice path={{ screen: 'abc', lowercase: false, letter: null, ...path }} onNavigate={() => {}} done={done} onComplete={() => {}} />,
);

describe('Tabs', () => {
  it('shows トレーニング as a tab', () => {
    const h = renderToStaticMarkup(
      <Tabs tabs={[{ id: 'myCards', label: 'tabs.myCards' }, { id: 'cardSets', label: 'tabs.cardSets' }, { id: 'training', label: 'tabs.training' }]} active="training" onChange={() => {}} />,
    );
    expect(h).toContain('トレーニング');
    expect(h).toMatch(/aria-current="page"[^]*トレーニング/);
  });
});

describe('TrainingTab', () => {
  it('shows the ABCを書こう card', () => {
    const h = renderToStaticMarkup(<TrainingTab onOpen={() => {}} />);
    expect(h).toContain('トレーニング');
    expect(h).toContain('ABCを書こう');
  });

  it('shows no cards when no activity is available', () => {
    const h = renderToStaticMarkup(<TrainingTab onOpen={() => {}} activities={[]} />);
    expect(h).not.toContain('ABCを書こう');
  });
});

describe('AbcPractice grid', () => {
  it('26 capital letters (drawn as pictures, named for screen readers), the switch and ← トレーニング', () => {
    const h = abc({});
    expect(h.match(/<button type="button" aria-label="[A-Z]"/g)).toHaveLength(26);
    expect(h).toContain('← トレーニング');
    expect(h).toMatch(/aria-pressed="true"[^>]*>大文字</);
    expect(h).toContain('<svg'); // letters come from the stroke data, not a font
  });

  it('small letters when switched', () => {
    const h = abc({ lowercase: true });
    expect(h.match(/<button type="button" aria-label="[a-z]"/g)).toHaveLength(26);
    expect(h).toMatch(/aria-pressed="true"[^>]*>小文字</);
  });

  it('a ✓ only on letters completed this visit, in the same case', () => {
    const h = abc({}, new Set(['B', 'c']));
    expect(h).toContain('aria-label="B（できた）"');
    expect(h).not.toContain('aria-label="C（できた）"');
    expect(h).toContain(`border:2px solid ${HW_COLORS.pass}`);
    expect(h).toContain('>1</span> / 26 できた');
  });
});

describe('AbcPractice letter page', () => {
  it('← ABCを書こう, the practice for that letter, and both arrows', () => {
    const h = abc({ screen: 'letter', letter: 'B' });
    expect(h).toContain('← ABCを書こう');
    expect(h).toContain('「B」をれんしゅうしよう');
    expect(h).toContain('‹ A');
    expect(h).toContain('C ›');
  });

  it('no previous letter at A, no next letter at z', () => {
    expect(abc({ screen: 'letter', letter: 'A' })).toMatch(/disabled=""[^>]*aria-label="前の文字"/);
    expect(abc({ screen: 'letter', letter: 'z', lowercase: true })).toMatch(/disabled=""[^>]*aria-label="次の文字"/);
  });
});

describe('DonePanel', () => {
  it('次の文字へ only when there is a next letter; もう一回 and とじる always', () => {
    const withNext = renderToStaticMarkup(<DonePanel onAgain={() => {}} onClose={() => {}} onNext={() => {}} />);
    expect(withNext).toContain('次の文字へ');
    expect(withNext).toContain('もう一回');
    expect(withNext).toContain('とじる');
    const last = renderToStaticMarkup(<DonePanel onAgain={() => {}} onClose={() => {}} />);
    expect(last).not.toContain('次の文字へ');
    expect(last).toContain('もう一回');
  });
});
