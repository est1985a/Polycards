// Tests for the Mastered parts of the Supabase queries. The Supabase client is replaced with a
// fake that records each call, so these never touch the real database or the test account.
// Run with: npm test
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MASTERED } from './srs';

const calls = [];
let result = { data: [], error: null, count: 0 };
const defaultRpc = async (name, args) => { calls.push(['rpc', name, args]); return result; };
let rpcImpl = defaultRpc;

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

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: (table) => { calls.push(['from', table]); return fakeQuery(); },
    rpc: (...args) => rpcImpl(...args),
  },
}));

const {
  fetchDueRows, fetchReviewRows, restoreMasteredCard, recordAnswer, waitForPendingSaves, fetchNextReview, fetchReviewPlanRows,
  fetchGachaStatus, pullGacha, fetchGachaCollection, equipAvatar, setGachaTheme, gachaErrorMessage,
} = await import('./api');

beforeEach(() => {
  calls.length = 0;
  result = { data: [], error: null, count: 0 };
  rpcImpl = defaultRpc;
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

describe('saving review answers (record_answer)', () => {
  const card = { wordId: 3, direction: 'en2jp' };
  const SESSION = '11111111-2222-4333-8444-555555555555';

  it('sends わかった and まだ to record_answer with the right arguments', async () => {
    await recordAnswer(card, 'got_it', SESSION);
    await recordAnswer({ wordId: 4, direction: 'jp2en' }, 'not_yet', SESSION);
    expect(calls).toEqual([
      ['rpc', 'record_answer', { p_word_id: 3, p_direction: 'en2jp', p_result: 'got_it', p_session_id: SESSION }],
      ['rpc', 'record_answer', { p_word_id: 4, p_direction: 'jp2en', p_result: 'not_yet', p_session_id: SESSION }],
    ]);
  });

  it('never writes user_cards itself', async () => {
    await recordAnswer(card, 'got_it', SESSION);
    expect(calls.some((c) => c[0] === 'from' || c[0] === 'update')).toBe(false);
  });

  it('returns what the database sends', async () => {
    result = { data: { result: 'got_it', level_before: 2, level_after: 3 }, error: null };
    expect(await recordAnswer(card, 'got_it', SESSION)).toEqual({ result: 'got_it', level_before: 2, level_after: 3 });
  });

  it('sends answers one at a time, in the order they were given', async () => {
    const log = [];
    let finishFirst;
    rpcImpl = (name, args) => {
      log.push(`start ${args.p_result}`);
      if (args.p_result === 'not_yet') {
        return new Promise((resolve) => { finishFirst = () => { log.push('end not_yet'); resolve(result); }; });
      }
      log.push(`end ${args.p_result}`);
      return Promise.resolve(result);
    };
    const first = recordAnswer(card, 'not_yet', SESSION);
    const second = recordAnswer(card, 'got_it', SESSION);
    await new Promise((r) => setTimeout(r, 0));
    expect(log).toEqual(['start not_yet']); // the second waits for the first
    finishFirst();
    await Promise.all([first, second]);
    expect(log).toEqual(['start not_yet', 'end not_yet', 'start got_it', 'end got_it']);
  });

  it('lets points wait for answers that are still saving', async () => {
    let finish;
    rpcImpl = () => new Promise((resolve) => { finish = () => resolve(result); });
    let saved = false;
    recordAnswer(card, 'got_it', SESSION).then(() => { saved = true; });
    await new Promise((r) => setTimeout(r, 0));
    const waiting = waitForPendingSaves();
    finish();
    await waiting;
    expect(saved).toBe(true);
  });

  it('keeps going after a failed answer', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    result = { data: null, error: { message: 'network down' } };
    const failed = recordAnswer(card, 'not_yet', SESSION);
    await expect(failed).rejects.toThrow('保存できませんでした');
    result = { data: { result: 'got_it' }, error: null };
    expect(await recordAnswer(card, 'got_it', SESSION)).toEqual({ result: 'got_it' });
    console.error.mockRestore();
  });

  it('turns database error codes into friendly Japanese messages', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    result = { data: null, error: { message: 'card_not_found' } };
    await expect(recordAnswer(card, 'got_it', SESSION)).rejects.toThrow('このカードは見つかりませんでした');
    result = { data: null, error: { message: 'not_signed_in' } };
    await expect(recordAnswer(card, 'got_it', SESSION)).rejects.toThrow('ログインしてください');
    result = { data: null, error: { message: 'bad_answer' } };
    await expect(recordAnswer(card, 'got_it', SESSION)).rejects.toThrow('保存できませんでした');
    console.error.mockRestore();
  });

  it('only warns in the console for a card that is not due (no pop-up)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    result = { data: null, error: { message: 'not_due' } };
    expect(await recordAnswer(card, 'got_it', SESSION)).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
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

describe('next review', () => {
  it('returns null when no card is waiting (no cards, or all Mastered)', async () => {
    expect(await fetchNextReview()).toBeNull();
    expect(calls).toContainEqual(['lt', 'level', MASTERED]);
  });

  it('returns the first review time and the count for that hour', async () => {
    result = { data: [{ next_review_at: '2026-10-13T09:42:00Z' }], error: null, count: 7 };
    expect(await fetchNextReview()).toEqual({ at: Date.parse('2026-10-13T09:42:00Z'), count: 7 });
    expect(calls).toContainEqual(['lt', 'next_review_at', '2026-10-13T10:00:00.000Z']); // end of that clock hour
    expect(calls).toContainEqual(['select', 'word_id', { count: 'exact', head: true }]);
  });

  it('reads the review plan in pages, without Mastered cards', async () => {
    await fetchReviewPlanRows();
    expect(calls).toContainEqual(['range', 0, 999]);
    expect(calls).toContainEqual(['lt', 'level', MASTERED]);
  });
});

describe('gacha', () => {
  it('only calls the database functions, never the gacha tables', async () => {
    await fetchGachaStatus();
    await pullGacha();
    await fetchGachaCollection();
    await equipAvatar(12);
    await setGachaTheme('pizza');
    expect(calls).toEqual([
      ['rpc', 'gacha_status', undefined],
      ['rpc', 'gacha_pull', undefined],
      ['rpc', 'gacha_collection', undefined],
      ['rpc', 'gacha_equip_avatar', { p_avatar_id: 12 }],
      ['rpc', 'gacha_set_theme', { p_theme: 'pizza' }],
    ]);
  });

  it('returns what the database sends', async () => {
    result = { data: { tickets: 2, owned: 3, total: 50 }, error: null };
    expect(await fetchGachaStatus()).toEqual({ tickets: 2, owned: 3, total: 50 });
    result = { data: null, error: null };
    expect(await fetchGachaCollection()).toEqual([]);
  });

  it('turns database error codes into friendly Japanese messages', async () => {
    result = { data: null, error: { message: 'no_tickets' } };
    await expect(pullGacha()).rejects.toThrow('ガチャ券がありません');
    result = { data: null, error: { message: 'collection_complete' } };
    await expect(pullGacha()).rejects.toThrow('全部そろいました！新しいアバターをお楽しみに');
    result = { data: null, error: { message: 'not_owned' } };
    await expect(equipAvatar(1)).rejects.toThrow('このアバターはまだ持っていません');
    result = { data: null, error: { message: 'theme_locked' } };
    await expect(setGachaTheme('neon')).rejects.toThrow('このテーマはまだ使えません');
  });

  it('keeps the original text for unknown errors', () => {
    expect(gachaErrorMessage({ message: 'network down' })).toContain('network down');
  });
});
