// Tests for the Training tab's menu and the ABCを書こう page (static render; the pen and the model
// can't run here). Run with: npm test
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import TrainingTab, { RewardPill } from './TrainingTab';
import AbcPractice, { RewardBanner } from './AbcPractice';
import { alphabet } from '../lib/training';
import Tabs from './Tabs';
import { DonePanel } from '../handwriting/LetterPractice.jsx';
import { HW_COLORS } from '../handwriting/config.js';

const abc = (path, done = new Set(), rewards = null) => renderToStaticMarkup(
  <AbcPractice path={{ screen: 'abc', lowercase: false, letter: null, ...path }} onNavigate={() => {}} done={done} onComplete={() => {}}
    rewards={rewards} onClaimReward={async () => {}} onOpenGacha={() => {}} />,
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
  it('26 capital letters (drawn as pictures, named for screen readers), the switch and the トレーニング back button', () => {
    const h = abc({});
    expect(h.match(/<button type="button" aria-label="[A-Z]"/g)).toHaveLength(26);
    expect(h).toContain('>トレーニング</span>');
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
  it('back to ABCを書こう, the practice for that letter, and both arrows', () => {
    const h = abc({ screen: 'letter', letter: 'B' });
    expect(h).toContain('>ABCを書こう</span>');
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

describe('ABC ticket reward banner', () => {
  const capitals = new Set(alphabet(false));
  const almost = new Set([...capitals].filter((l) => l !== 'Z'));

  it('nothing when the claimed list is unknown (e.g. the SQL is not run yet)', () => {
    const h = abc({}, capitals, null);
    expect(h).not.toContain('ガチャ券');
  });

  it('locked: tells what to do, no button', () => {
    const h = abc({}, almost, new Set());
    expect(h).toContain('26文字ぜんぶできたら ガチャ券1枚！');
    expect(h).not.toContain('ガチャ券をもらう');
  });

  it('the 26th letter turns it to ready at once (same data the grid uses, no reload)', () => {
    expect(abc({}, almost, new Set())).not.toContain('ガチャ券をもらう');
    const h = abc({}, new Set([...almost, 'Z']), new Set());
    expect(h).toContain('ガチャ券をもらう');
    expect(h).toContain('>26</span> / 26 できた');
  });

  it('per case: all capitals done does not unlock the small letters', () => {
    expect(abc({ lowercase: true }, capitals, new Set())).not.toContain('ガチャ券をもらう');
  });

  it('claimed: won, with a link to the gacha and no button', () => {
    const h = abc({}, capitals, new Set(['abc-upper']));
    expect(h).toContain('✓ ガチャ券ゲット済み！');
    expect(h).toContain('ガチャへ');
    expect(h).not.toContain('ガチャ券をもらう');
  });

  it('+1 ガチャ券！ right after claiming, read out as a status', () => {
    const h = renderToStaticMarkup(<RewardBanner state="claimed" rewardId="abc-upper" onClaim={async () => {}} initialJustGot />);
    expect(h).toMatch(/role="status"[^>]*>.*\+1 ガチャ券！/);
  });
});

describe('Training menu reward pill', () => {
  it('ガチャ券×2 / ×1 while tickets are left, ゲット済み when both are won, nothing when unknown', () => {
    expect(renderToStaticMarkup(<RewardPill left={2} />)).toContain('ガチャ券×2');
    expect(renderToStaticMarkup(<RewardPill left={1} />)).toContain('aria-label="ガチャ券があと1枚もらえます"');
    expect(renderToStaticMarkup(<RewardPill left={0} />)).toContain('ゲット済み');
    expect(renderToStaticMarkup(<RewardPill left={null} />)).toBe('');
  });

  it('on the ABCを書こう card', () => {
    expect(renderToStaticMarkup(<TrainingTab onOpen={() => {}} rewards={new Set(['abc-upper'])} />)).toContain('ガチャ券×1');
    expect(renderToStaticMarkup(<TrainingTab onOpen={() => {}} />)).not.toContain('ガチャ券');
  });
});
