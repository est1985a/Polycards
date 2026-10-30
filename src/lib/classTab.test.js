// Tests for the クラス tab helpers (which class is shown, medals). Run with: npm test
import { describe, it, expect } from 'vitest';
import { loadLastClass, saveLastClass, pickClass, medal } from './classTab';

const memory = () => {
  const data = {};
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; }, data };
};

describe('the class shown', () => {
  it('remembers the last class per account', () => {
    const s = memory();
    saveLastClass(s, 'u1', 'c2');
    expect(loadLastClass(s, 'u1')).toBe('c2');
    expect(loadLastClass(s, 'u2')).toBe(null);
    expect(s.data['polycards.classTab.u1']).toBe('c2');
  });

  it('never throws when storage is blocked', () => {
    const broken = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); } };
    expect(loadLastClass(broken, 'u1')).toBe(null);
    expect(() => saveLastClass(broken, 'u1', 'c1')).not.toThrow();
    expect(loadLastClass(null, 'u1')).toBe(null);
  });

  it('picks the saved class while the student is still in it, else the first', () => {
    const classes = [{ id: 'c1' }, { id: 'c2' }];
    expect(pickClass(classes, 'c2')).toBe('c2');
    expect(pickClass(classes, 'gone')).toBe('c1');
    expect(pickClass(classes, null)).toBe('c1');
    expect(pickClass([], 'c1')).toBe(null);
    expect(pickClass(null, 'c1')).toBe(null);
  });
});

describe('medals', () => {
  it('gives gold, silver and bronze to ranks 1–3 (ties share)', () => {
    expect([1, 2, 2, 3, 4, 10].map(medal)).toEqual(['gold', 'silver', 'silver', 'bronze', null, null]);
  });
});
