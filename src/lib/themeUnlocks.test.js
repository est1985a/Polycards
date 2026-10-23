// Tests for theme unlocks by rank. Run with: npm test
import { describe, it, expect } from 'vitest';
import { themes } from '../themes';
import { themeList, unlockedThemes, newThemes, featuredUnlock, markSeen, unlockLabel } from './themeUnlocks';

// The order Andre set in theme_unlocks (supabase/polycards-theme-order.sql), shuffled on purpose.
const ROWS = [
  { theme_key: 'lagoon', unlock_level: 20 }, { theme_key: 'midnight', unlock_level: 1 },
  { theme_key: 'snow', unlock_level: 10 }, { theme_key: 'galaxy', unlock_level: 70 },
  { theme_key: 'ryukoku', unlock_level: 5 }, { theme_key: 'pizza', unlock_level: 15 },
  { theme_key: 'sakura', unlock_level: 30 }, { theme_key: 'matcha', unlock_level: 40 },
  { theme_key: 'autumn', unlock_level: 50 }, { theme_key: 'neon', unlock_level: 60 },
];
const list = themeList(ROWS, themes);

describe('themeList', () => {
  it('puts every theme in unlock order with its name', () => {
    expect(list.map((t) => t.key)).toEqual(['midnight', 'ryukoku', 'snow', 'pizza', 'lagoon', 'sakura', 'matcha', 'autumn', 'neon', 'galaxy']);
    expect(list[1]).toMatchObject({ key: 'ryukoku', name: 'Ryukoku', unlockLevel: 5, theme: themes.ryukoku });
  });

  it('every theme in src/themes.js has a row (a new theme needs both)', () => {
    expect(list.map((t) => t.key).sort()).toEqual(Object.keys(themes).sort());
  });

  it('skips rows for themes the app does not have, and handles no rows', () => {
    expect(themeList([{ theme_key: 'vapor', unlock_level: 3 }, { theme_key: 'midnight', unlock_level: 1 }], themes).map((t) => t.key)).toEqual(['midnight']);
    expect(themeList(null, themes)).toEqual([]);
  });
});

describe('unlockedThemes', () => {
  it('unlocks a theme when its rank is reached (unlock_level <= rank)', () => {
    expect(unlockedThemes(list, 1)).toEqual(['midnight']);
    expect(unlockedThemes(list, 4)).toEqual(['midnight']);
    expect(unlockedThemes(list, 5)).toEqual(['midnight', 'ryukoku']);
    expect(unlockedThemes(list, 23)).toEqual(['midnight', 'ryukoku', 'snow', 'pizza', 'lagoon']);
    expect(unlockedThemes(list, 70)).toHaveLength(10);
  });
});

describe('newThemes / featuredUnlock', () => {
  it('nothing is new at rank 1 (Midnight is there from the start)', () => {
    expect(newThemes(list, 1, [])).toEqual([]);
    expect(featuredUnlock(list, 1, [])).toBeNull();
  });

  it('a rank 23 student who has seen nothing: Lagoon first, 3 others', () => {
    expect(newThemes(list, 23, []).map((t) => t.key)).toEqual(['lagoon', 'pizza', 'snow', 'ryukoku']);
    const f = featuredUnlock(list, 23, []);
    expect(f.theme.key).toBe('lagoon');
    expect(f.others).toBe(3);
  });

  it('only unseen themes count', () => {
    expect(newThemes(list, 23, ['midnight', 'ryukoku', 'snow', 'pizza']).map((t) => t.key)).toEqual(['lagoon']);
    expect(featuredUnlock(list, 23, ['ryukoku', 'snow', 'pizza', 'lagoon'])).toBeNull();
    expect(featuredUnlock(list, 30, ['ryukoku', 'snow', 'pizza', 'lagoon'])).toMatchObject({ theme: { key: 'sakura' }, others: 0 });
  });

  it('marking as seen covers everything unlocked now, and keeps older entries', () => {
    const seen = markSeen(list, 10, ['old']);
    expect(seen).toEqual(['old', 'midnight', 'ryukoku', 'snow']);
    expect(newThemes(list, 10, seen)).toEqual([]);
    expect(newThemes(list, 15, seen).map((t) => t.key)).toEqual(['pizza']);
  });
});

describe('unlockLabel', () => {
  it('says from the start, unlocked or the rank needed', () => {
    expect(unlockLabel(list[0], 1)).toBe('はじめから');
    expect(unlockLabel(list[1], 7)).toBe('ランク 5 で解放ずみ');
    expect(unlockLabel(list[2], 7)).toBe('ランク 10 で解放');
  });
});
