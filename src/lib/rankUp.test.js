// Tests for the rank-up pop-up rules. Run with: npm test
import { describe, it, expect } from 'vitest';
import { rankUpView, nextReward, themesSeenAt } from './rankUp';

const THEME_RANKS = { midnight: 1, ryukoku: 5, snow: 10, pizza: 15, lagoon: 20, sakura: 30, matcha: 40, autumn: 50, neon: 60, galaxy: 70 };
const themeItems = Object.entries(THEME_RANKS).map(([key, unlockLevel]) => ({ key, name: key, unlockLevel, theme: {} }));
const specials = [80, 90, 100, 110, 120].map((r, i) => ({ id: 100 + i, slug: `special-${i}`, rarity: 'special', unlock_rank: r, owned: false }));
const rewards = (rank, seen) => ({ rank, last_seen_rank: seen, specials });

describe('rankUpView', () => {
  it('shows nothing when the rank is not above the last seen rank, or before loading', () => {
    expect(rankUpView(rewards(12, 12), themeItems)).toBeNull();
    expect(rankUpView(rewards(11, 12), themeItems)).toBeNull();
    expect(rankUpView(null, themeItems)).toBeNull();
    expect(rankUpView(rewards(13, 12), null)).toBeNull();
  });

  it('a plain rank-up: nothing unlocked, the next theme with ranks to go', () => {
    const v = rankUpView(rewards(12, 11), themeItems);
    expect(v.rank).toBe(12);
    expect(v.newThemes).toEqual([]);
    expect(v.newSpecials).toEqual([]);
    expect(v.next).toMatchObject({ kind: 'theme', unlockRank: 15, ranksToGo: 3 });
    expect(v.next.theme.key).toBe('pizza');
  });

  it('reaching a theme rank unlocks it; the next reward is the following theme', () => {
    const v = rankUpView(rewards(20, 19), themeItems);
    expect(v.newThemes.map((t) => t.key)).toEqual(['lagoon']);
    expect(v.next).toMatchObject({ kind: 'theme', unlockRank: 30, ranksToGo: 10 });
  });

  it('several ranks at once: one view for the newest rank, every theme passed, highest first', () => {
    const v = rankUpView(rewards(16, 4), themeItems);
    expect(v.rank).toBe(16);
    expect(v.newThemes.map((t) => t.key)).toEqual(['pizza', 'snow', 'ryukoku']);
  });

  it('after the last theme, the next reward is the next Special Polyavatar', () => {
    const v = rankUpView(rewards(70, 69), themeItems);
    expect(v.newThemes.map((t) => t.key)).toEqual(['galaxy']);
    expect(v.next).toMatchObject({ kind: 'special', unlockRank: 80, ranksToGo: 10 });
    expect(v.next.avatar.id).toBe(100);
    expect(rankUpView(rewards(85, 84), themeItems).next).toMatchObject({ kind: 'special', unlockRank: 90, ranksToGo: 5 });
  });

  it('reaching 80 gives Bronze; 120 gives Diamond and there is no next reward', () => {
    expect(rankUpView(rewards(80, 79), themeItems).newSpecials.map((a) => a.unlock_rank)).toEqual([80]);
    const top = rankUpView(rewards(120, 119), themeItems);
    expect(top.newSpecials.map((a) => a.unlock_rank)).toEqual([120]);
    expect(top.next).toBeNull();
    expect(rankUpView(rewards(125, 124), themeItems)).toMatchObject({ newThemes: [], newSpecials: [], next: null });
  });

  it('never counts the starting theme as new', () => {
    expect(rankUpView(rewards(2, 0), themeItems).newThemes).toEqual([]);
  });
});

describe('nextReward', () => {
  it('works with no Specials (SQL not run yet)', () => {
    expect(nextReward(70, themeItems, [])).toBeNull();
    expect(nextReward(3, themeItems)).toMatchObject({ kind: 'theme', unlockRank: 5, ranksToGo: 2 });
  });
});

describe('themesSeenAt', () => {
  it('lists every theme unlocked at this rank', () => {
    expect(themesSeenAt(themeItems, 15)).toEqual(['midnight', 'ryukoku', 'snow', 'pizza']);
  });
});
