// Tests for the Mastered parts of the Supabase queries. The Supabase client is replaced with a
// fake that records each call, so these never touch the real database or the test account.
// Run with: npm test
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MASTERED } from './srs';

const calls = [];
let result = { data: [], error: null, count: 0 };

// A fake query: every method records its name and arguments and returns the same query;
// awaiting it gives `result`.
function fakeQuery() {
  const query = new Proxy({}, {
    get(_, name) {
      if (name === 'then') return (resolve) => resolve(result);
      return (...args) => { calls.push([name, ...args]); return query; };
    },
  });
  return query;
}

vi.mock('./supabaseClient', () => ({ supabase: { from: (table) => { calls.push(['from', table]); return fakeQuery(); } } }));

const { fetchDueRows, fetchReviewRows, restoreMasteredCard, saveProgress } = await import('./api');

beforeEach(() => {
  calls.length = 0;
  result = { data: [], error: null, count: 0 };
});

describe('Mastered cards are never due', () => {
  it('leaves Mastered cards out of the due counts', async () => {
    await fetchDueRows();
    expect(calls).toContainEqual(['lt', 'level', MASTERED]);
  });

  it('leaves Mastered cards out of a review (all decks or one deck)', async () => {
    await fetchReviewRows();
    expect(calls).toContainEqual(['lt', 'level', MASTERED]);
    calls.length = 0;
    await fetchReviewRows(7);
    expect(calls).toContainEqual(['lt', 'level', MASTERED]);
  });
});

describe('due cards', () => {
  it('reads due cards in pages, so counts stay right beyond 1,000 rows', async () => {
    await fetchDueRows();
    expect(calls).toContainEqual(['range', 0, 999]);
  });
});

describe('saving answers', () => {
  it('saves a Mastered card with no next review and a mastered_at time', async () => {
    await saveProgress('u1', { wordId: 3, direction: 'en2jp' }, MASTERED);
    const [, fields] = calls.find((c) => c[0] === 'update');
    expect(fields.level).toBe(MASTERED);
    expect(fields.next_review_at).toBeNull();
    expect(fields.mastered_at).not.toBeNull();
  });
});

describe('putting a card back', () => {
  it('updates only that card to level 1, due now, not Mastered', async () => {
    const before = Date.now();
    await restoreMasteredCard('u1', { wordId: 3, direction: 'jp2en' });
    const [, fields] = calls.find((c) => c[0] === 'update');
    expect(fields.level).toBe(1);
    expect(fields.mastered_at).toBeNull();
    const due = new Date(fields.next_review_at).getTime();
    expect(due).toBeGreaterThanOrEqual(before);
    expect(due).toBeLessThanOrEqual(Date.now());
    expect(calls).toContainEqual(['eq', 'user_id', 'u1']);
    expect(calls).toContainEqual(['eq', 'word_id', 3]);
    expect(calls).toContainEqual(['eq', 'direction', 'jp2en']);
  });

  it('reports an error from Supabase', async () => {
    result = { data: null, error: { message: 'nope' } };
    await expect(restoreMasteredCard('u1', { wordId: 3, direction: 'jp2en' })).rejects.toThrow('nope');
  });
});
