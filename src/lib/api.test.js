// Tests for the Mastered parts of the Supabase queries. The Supabase client is replaced with a
// fake that records each call, so these never touch the real database or the test account.
// Run with: npm test
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MASTERED } from './srs';

const calls = [];
let result = { data: [], error: null, count: 0 };
const defaultRpc = async (name, args) => { calls.push(['rpc', name, args]); return result; };
let rpcImpl = defaultRpc;
let sessionUser = 'u1';
let uploadError = null;

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
    auth: { getSession: async () => ({ data: { session: sessionUser ? { user: { id: sessionUser } } : null } }) },
    storage: {
      from: (bucket) => ({
        upload: async (...args) => { calls.push(['upload', bucket, ...args]); return { error: uploadError }; },
      }),
    },
  },
}));

const {
  fetchDueRows, fetchReviewRows, fetchDeckWords, fetchMasteredCards, restoreMasteredCard, recordAnswer, waitForPendingSaves, holdAnswer, flushHeldAnswer, dropHeldAnswer, checkOtherMeaning, fetchBonusPoints, fetchNextReview, fetchReviewPlanRows,
  fetchCollections, fetchGachaStatus, pullGacha, fetchGachaCollection, equipAvatar, setGachaTheme, gachaErrorMessage, fetchThemeUnlocks,
  fetchSeenThemeUnlocks, markThemeUnlocksSeen, fetchTrainingProgress, recordTrainingCompletion,
  fetchStudyDays, fetchStudyTotals, fetchTroubleWords, addDeckToMyCards, fetchOwnedWordIds,
} = await import('./api');
const api = await import('./api');

beforeEach(() => {
  calls.length = 0;
  result = { data: [], error: null, count: 0 };
  rpcImpl = defaultRpc;
  sessionUser = 'u1';
  uploadError = null;
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

describe('recorded audio', () => {
  it('word queries load audio_path (deck word list and both review queries)', async () => {
    const selects = async (fn) => { calls.length = 0; await fn(); return calls.filter((c) => c[0] === 'select').map((c) => c[1]); };
    expect((await selects(() => fetchDeckWords(3)))[0]).toContain('audio_path');
    expect((await selects(() => fetchReviewRows()))[0]).toContain('audio_path');
    expect((await selects(() => fetchReviewRows(7)))[0]).toContain('audio_path');
  });
});

describe('parts of speech', () => {
  it('word queries load pos (deck word list, both review queries and the Mastered list)', async () => {
    const selects = async (fn) => { calls.length = 0; await fn(); return calls.filter((c) => c[0] === 'select').map((c) => c[1]); };
    expect((await selects(() => fetchDeckWords(3)))[0]).toMatch(/words \(.*\bpos\b/);
    expect((await selects(() => fetchReviewRows()))[0]).toMatch(/words!inner \(.*\bpos\b/);
    expect((await selects(() => fetchReviewRows(7)))[0]).toMatch(/words!inner \(.*\bpos\b/);
    expect((await selects(() => fetchMasteredCards()))[0]).toContain('words ( english, japanese, pos )');
  });

  it('Mastered cards carry pos (null when missing or unknown)', async () => {
    result = { data: [
      { word_id: 'a', direction: 'en2jp', mastered_at: '2026-10-01', words: { english: 'dog', japanese: '犬', pos: 'noun' } },
      { word_id: 'b', direction: 'jp2en', mastered_at: '2026-09-01', words: { english: 'herb', japanese: 'ハーブ', pos: null } },
      { word_id: 'c', direction: 'jp2en', mastered_at: '2026-08-01', words: { english: 'x', japanese: 'x', pos: 'nounz' } },
    ], error: null, count: 3 };
    expect((await fetchMasteredCards()).map((c) => c.pos)).toEqual(['noun', null, null]);
  });
});

describe('review size', () => {
  it('loads 20 cards unless the student chose another number', async () => {
    await fetchReviewRows();
    expect(calls).toContainEqual(['limit', 20]);
    calls.length = 0;
    await fetchReviewRows(null, 10);
    expect(calls).toContainEqual(['limit', 10]);
    calls.length = 0;
    await fetchReviewRows(7, 30);
    expect(calls).toContainEqual(['limit', 30]);
  });
});

describe('theme unlocks', () => {
  it('reads theme_key and unlock_level from theme_unlocks, lowest rank first', async () => {
    result = { data: [{ theme_key: 'midnight', unlock_level: 1 }], error: null };
    expect(await fetchThemeUnlocks()).toEqual([{ theme_key: 'midnight', unlock_level: 1 }]);
    expect(calls).toEqual([
      ['from', 'theme_unlocks'],
      ['select', 'theme_key, unlock_level'],
      ['order', 'unlock_level', { ascending: true }],
    ]);
  });

  it('throws when the table cannot be read', async () => {
    result = { data: null, error: { message: 'denied' } };
    await expect(fetchThemeUnlocks()).rejects.toThrow('Could not load themes: denied');
  });
});

describe('stats page', () => {
  it('reads study days in pages, oldest first, without got_it / not_yet', async () => {
    result = { data: [{ day: '2026-10-24', reviews: 5 }], error: null, count: 1 };
    expect(await fetchStudyDays()).toEqual([{ day: '2026-10-24', reviews: 5 }]);
    expect(calls).toContainEqual(['from', 'user_study_daily']);
    expect(calls).toContainEqual(['select', 'day, reviews, spelled_correctly, bonus_points', { count: 'exact' }]);
    expect(calls).toContainEqual(['order', 'day', { ascending: true }]);
    expect(calls).toContainEqual(['range', 0, 999]);
    expect(JSON.stringify(calls)).not.toMatch(/got_it|not_yet/);
  });

  it('reads the totals row, or zeros when there is none', async () => {
    result = { data: { reviews: 120, spelled_correctly: 30, bonus_points: 30 }, error: null };
    expect(await fetchStudyTotals()).toEqual({ reviews: 120, spelled_correctly: 30, bonus_points: 30 });
    expect(calls).toEqual([
      ['from', 'user_study_totals'],
      ['select', 'reviews, spelled_correctly, bonus_points'],
      ['maybeSingle'],
    ]);
    result = { data: null, error: null };
    expect(await fetchStudyTotals()).toEqual({ reviews: 0, spelled_correctly: 0, bonus_points: 0 });
  });

  it('calls my_trouble_words with its defaults', async () => {
    const word = { word_id: 'w1', english: 'since', japanese: 'から', misses: 3, last_missed: '2026-10-23T10:00:00Z', lowest_level: 1 };
    result = { data: [word], error: null };
    expect(await fetchTroubleWords()).toEqual([word]);
    expect(calls).toEqual([['rpc', 'my_trouble_words', undefined]]);
    result = { data: null, error: null };
    expect(await fetchTroubleWords()).toEqual([]);
  });

  it('throws when a stats query fails', async () => {
    result = { data: null, error: { message: 'denied' }, count: null };
    await expect(fetchStudyDays()).rejects.toThrow('Could not load study days: denied');
    await expect(fetchStudyTotals()).rejects.toThrow('Could not load study totals: denied');
    await expect(fetchTroubleWords()).rejects.toThrow('Could not load trouble words: denied');
  });
});

describe('collections (Tests & Themes)', () => {
  it('reads collections and their decks in pages, with word counts', async () => {
    await fetchCollections();
    expect(calls).toContainEqual(['from', 'collections']);
    expect(calls).toContainEqual(['from', 'collection_decks']);
    expect(calls.filter((c) => c[0] === 'range' && c[1] === 0 && c[2] === 999)).toHaveLength(2);
    const select = calls.find((c) => c[0] === 'select' && String(c[1]).includes('collection_id'));
    expect(select[1]).toContain('deck_words ( count )');
  });

  it('throws when the query fails', async () => {
    result = { data: null, error: { message: 'boom' }, count: null };
    await expect(fetchCollections()).rejects.toThrow('boom');
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

  it('sends what the student typed as p_typed (typing mode)', async () => {
    await recordAnswer({ wordId: 4, direction: 'jp2en' }, 'got_it', SESSION, 'apple');
    expect(calls).toEqual([
      ['rpc', 'record_answer', { p_word_id: 4, p_direction: 'jp2en', p_result: 'got_it', p_session_id: SESSION, p_typed: 'apple' }],
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

  it('keeps going after a failed answer, logging every failure', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    result = { data: null, error: { message: 'network down' } };
    await expect(recordAnswer(card, 'not_yet', SESSION)).rejects.toThrow('保存できませんでした');
    await expect(recordAnswer(card, 'not_yet', SESSION)).rejects.toThrow('保存できませんでした');
    expect(error).toHaveBeenCalledTimes(2);
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

describe('the held answer (undo)', () => {
  const card = { wordId: 3, direction: 'en2jp' };
  const SESSION = '11111111-2222-4333-8444-555555555555';
  const rpcResults = () => calls.filter((c) => c[0] === 'rpc').map((c) => c[2].p_result);

  it('sends nothing until it is flushed, then sends it once', async () => {
    holdAnswer(() => recordAnswer(card, 'not_yet', SESSION));
    await new Promise((r) => setTimeout(r, 0));
    expect(rpcResults()).toEqual([]);
    expect(flushHeldAnswer()).toBe(true);
    expect(flushHeldAnswer()).toBe(false);
    await waitForPendingSaves();
    expect(rpcResults()).toEqual(['not_yet']);
  });

  it('is in the pending saves as soon as it is flushed, so points wait for it', async () => {
    let finish;
    rpcImpl = (name, args) => { calls.push(['rpc', name, args]); return new Promise((resolve) => { finish = () => resolve(result); }); };
    let saved = false;
    holdAnswer(() => recordAnswer(card, 'got_it', SESSION).then(() => { saved = true; }));
    flushHeldAnswer();
    const waiting = waitForPendingSaves();
    await new Promise((r) => setTimeout(r, 0));
    finish();
    await waiting;
    await new Promise((r) => setTimeout(r, 0));
    expect(saved).toBe(true);
  });

  it('sends nothing after an undo', async () => {
    holdAnswer(() => recordAnswer(card, 'got_it', SESSION));
    dropHeldAnswer();
    expect(flushHeldAnswer()).toBe(false);
    await waitForPendingSaves();
    expect(rpcResults()).toEqual([]);
  });

  it('sends the held answer before the next one, keeping the order', async () => {
    holdAnswer(() => recordAnswer(card, 'not_yet', SESSION));
    holdAnswer(() => recordAnswer(card, 'got_it', SESSION)); // the next まだ / わかった
    flushHeldAnswer(); // e.g. a correct spelling: the held answer goes first...
    recordAnswer(card, 'dont_know', SESSION); // ...then the answer sent at once
    await waitForPendingSaves();
    expect(rpcResults()).toEqual(['not_yet', 'got_it', 'dont_know']);
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

describe('seen theme unlocks (saved on the account)', () => {
  it('reads and adds to the list through the database functions', async () => {
    result = { data: ['ryukoku'], error: null };
    expect(await fetchSeenThemeUnlocks()).toEqual(['ryukoku']);
    result = { data: ['ryukoku', 'snow'], error: null };
    expect(await markThemeUnlocksSeen(['snow'])).toEqual(['ryukoku', 'snow']);
    expect(calls).toEqual([
      ['rpc', 'seen_theme_unlocks', undefined],
      ['rpc', 'mark_theme_unlocks_seen', { p_keys: ['snow'] }],
    ]);
  });

  it('gives an empty list for no data and throws on errors', async () => {
    result = { data: null, error: null };
    expect(await fetchSeenThemeUnlocks()).toEqual([]);
    result = { data: null, error: { message: 'denied' } };
    await expect(fetchSeenThemeUnlocks()).rejects.toThrow('Could not load seen themes: denied');
    await expect(markThemeUnlocksSeen(['snow'])).rejects.toThrow('Could not save seen themes: denied');
  });
});

describe('rank-up pop-up (rank_rewards / mark_rank_seen)', () => {
  it('reads the rank rewards and saves the seen rank through the database functions', async () => {
    result = { data: { rank: 12, last_seen_rank: 11, specials: [{ id: 1, unlock_rank: 80 }] }, error: null };
    expect(await api.fetchRankRewards()).toEqual({ rank: 12, last_seen_rank: 11, specials: [{ id: 1, unlock_rank: 80 }] });
    result = { data: 12, error: null };
    await api.markRankSeen(12);
    expect(calls).toEqual([
      ['rpc', 'rank_rewards', undefined],
      ['rpc', 'mark_rank_seen', { p_rank: 12 }],
    ]);
  });

  it('never throws: an error or missing data means no pop-up', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    result = { data: null, error: { message: 'function does not exist' } };
    expect(await api.fetchRankRewards()).toBeNull();
    await expect(api.markRankSeen(3)).resolves.toBeUndefined();
    result = { data: { rank: 3 }, error: null };
    expect(await api.fetchRankRewards()).toBeNull();
    result = { data: { rank: 3, last_seen_rank: 2 }, error: null };
    expect((await api.fetchRankRewards()).specials).toEqual([]);
    warn.mockRestore();
    err.mockRestore();
  });
});

describe('training progress', () => {
  it('reads own rows from user_training_progress', async () => {
    result = { data: [{ practice_id: 'abc-upper-b', times_completed: 2 }], error: null };
    expect(await fetchTrainingProgress()).toEqual([{ practice_id: 'abc-upper-b', times_completed: 2 }]);
    expect(calls).toEqual([
      ['from', 'user_training_progress'],
      ['select', 'practice_id, times_completed, first_completed_at, last_completed_at'],
    ]);
  });

  it('saves a completion only through record_training_completion', async () => {
    await recordTrainingCompletion('abc-lower-b');
    expect(calls).toEqual([['rpc', 'record_training_completion', { p_practice_id: 'abc-lower-b' }]]);
  });

  it('throws on errors', async () => {
    result = { data: null, error: { message: 'denied' } };
    await expect(fetchTrainingProgress()).rejects.toThrow('Could not load training progress: denied');
    await expect(recordTrainingCompletion('abc-lower-b')).rejects.toThrow('Could not save training progress: denied');
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
    await expect(pullGacha()).rejects.toThrow('全部そろいました！新しいポリアバターをお楽しみに');
    result = { data: null, error: { message: 'not_owned' } };
    await expect(equipAvatar(1)).rejects.toThrow('このポリアバターはまだ持っていません');
    result = { data: null, error: { message: 'theme_locked' } };
    await expect(setGachaTheme('neon')).rejects.toThrow('このテーマはまだ使えません');
  });

  it('keeps the original text for unknown errors', () => {
    expect(gachaErrorMessage({ message: 'network down' })).toContain('network down');
  });
});

describe('spelling bonus', () => {
  it('reads the bonus from the student\'s own user_study_totals row', async () => {
    result = { data: { bonus_points: 7 }, error: null };
    expect(await fetchBonusPoints()).toBe(7);
    expect(calls).toEqual([['from', 'user_study_totals'], ['select', 'bonus_points'], ['maybeSingle']]);
  });

  it('is 0 when the student has no row yet', async () => {
    result = { data: null, error: null };
    expect(await fetchBonusPoints()).toBe(0);
  });
});

describe('other meaning check (typing mode)', () => {
  const WORD = '0b9c6a52-1111-4222-8333-444455556666';

  it('asks other_meaning_check with the word id and what was typed, and writes nothing', async () => {
    await checkOtherMeaning(WORD, 'from');
    expect(calls).toEqual([['rpc', 'other_meaning_check', { p_word_id: WORD, p_typed: 'from' }]]);
  });

  it('returns what the database says', async () => {
    result = { data: true, error: null };
    expect(await checkOtherMeaning(WORD, 'from')).toBe(true);
    result = { data: false, error: null };
    expect(await checkOtherMeaning(WORD, 'banana')).toBe(false);
    result = { data: null, error: null };
    expect(await checkOtherMeaning(WORD, 'banana')).toBe(false);
  });

  it('treats an error as false, with only a console warning (no throw, so no pop-up)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      result = { data: null, error: { message: 'network down' } };
      expect(await checkOtherMeaning(WORD, 'from')).toBe(false);
      rpcImpl = async () => { throw new Error('offline'); };
      expect(await checkOtherMeaning(WORD, 'from')).toBe(false);
      expect(warn).toHaveBeenCalledTimes(2);
    } finally {
      warn.mockRestore();
    }
  });
});

describe('adding a deck (pack opening)', () => {
  it('checks which words the student already has before adding them', async () => {
    result = { data: [{ word_id: 'a' }, { word_id: 'b' }], error: null };
    const res = await addDeckToMyCards('user-1', 5);
    const checkAt = calls.findIndex((c) => c[0] === 'from' && c[1] === 'user_cards');
    const upsertAt = calls.findIndex((c) => c[0] === 'upsert');
    expect(checkAt).toBeGreaterThan(-1);
    expect(checkAt).toBeLessThan(upsertAt);
    expect(calls).toContainEqual(['in', 'word_id', ['a', 'b']]);
    expect(res).toEqual({ wordIds: ['a', 'b'], ownedWordIds: ['a', 'b'] });
  });
});

describe('fetchOwnedWordIds (word list preview and adding a deck)', () => {
  it("asks only for this student's rows for these words, and removes duplicates (one row per direction)", async () => {
    result = { data: [{ word_id: 'a' }, { word_id: 'a' }, { word_id: 'c' }], error: null };
    expect(await fetchOwnedWordIds('user-1', ['a', 'b', 'c'])).toEqual(['a', 'c']);
    expect(calls).toContainEqual(['from', 'user_cards']);
    expect(calls).toContainEqual(['select', 'word_id']);
    expect(calls).toContainEqual(['eq', 'user_id', 'user-1']);
    expect(calls).toContainEqual(['in', 'word_id', ['a', 'b', 'c']]);
  });

  it('returns an empty list when nothing is owned', async () => {
    result = { data: [], error: null };
    expect(await fetchOwnedWordIds('user-1', ['a'])).toEqual([]);
  });

  it('returns null without a query when not signed in or there are no words', async () => {
    expect(await fetchOwnedWordIds(null, ['a'])).toBeNull();
    expect(await fetchOwnedWordIds('user-1', [])).toBeNull();
    expect(calls).toEqual([]);
  });

  it('returns null with only a console warning when the query fails (never throws)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      result = { data: null, error: { message: 'network down' } };
      expect(await fetchOwnedWordIds('user-1', ['a'])).toBeNull();
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });
});

describe('teachers and classes', () => {
  it('calls each database function with the right arguments', async () => {
    result = { data: [], error: null };
    await api.fetchTeacherClasses(true);
    await api.createClass('1年A組', 2026);
    await api.updateClass('c1', '1年B組', 2027);
    await api.setClassArchived('c1', true);
    await api.regenerateJoinCode('c1');
    await api.searchUsers('aid', true);
    await api.addStudentToClass('c1', 's1', '山田', 7);
    await api.updateClassMember('c1', 's1', '山田', null);
    await api.removeStudentFromClass('c1', 's1');
    await api.addCoTeacher('c1', 't2');
    await api.removeCoTeacher('c1', 't2');
    await api.checkJoinCode('ABC234');
    await api.joinClass('ABC234', '山田', 7, 'Yama');
    await api.fetchMyClasses();
    await api.fetchClassLeavers('c1');
    expect(calls).toEqual([
      ['rpc', 'teacher_classes', { p_archived: true }],
      ['rpc', 'create_class', { p_name: '1年A組', p_school_year: 2026 }],
      ['rpc', 'update_class', { p_class_id: 'c1', p_name: '1年B組', p_school_year: 2027 }],
      ['rpc', 'set_class_archived', { p_class_id: 'c1', p_archived: true }],
      ['rpc', 'regenerate_join_code', { p_class_id: 'c1' }],
      ['rpc', 'search_users', { p_query: 'aid', p_teachers_only: true }],
      ['rpc', 'add_student_to_class', { p_class_id: 'c1', p_student_id: 's1', p_real_name: '山田', p_student_number: 7 }],
      ['rpc', 'update_class_member', { p_class_id: 'c1', p_student_id: 's1', p_real_name: '山田', p_student_number: null }],
      ['rpc', 'remove_student_from_class', { p_class_id: 'c1', p_student_id: 's1' }],
      ['rpc', 'add_co_teacher', { p_class_id: 'c1', p_teacher_user_id: 't2' }],
      ['rpc', 'remove_co_teacher', { p_class_id: 'c1', p_teacher_user_id: 't2' }],
      ['rpc', 'check_join_code', { p_code: 'ABC234' }],
      ['rpc', 'join_class', { p_code: 'ABC234', p_real_name: '山田', p_student_number: 7, p_nickname: 'Yama' }],
      ['rpc', 'my_classes', undefined],
      ['rpc', 'class_leavers', { p_class_id: 'c1' }],
    ]);
  });

  it('never reads or writes the class tables directly', async () => {
    await api.fetchClassDetail('c1');
    expect(calls.filter((c) => c[0] === 'from')).toEqual([]);
  });

  it('fills in an empty class detail', async () => {
    result = { data: null, error: null };
    expect(await api.fetchClassDetail('c1')).toEqual({ class: null, students: [], teachers: [] });
  });

  it('turns database errors into friendly messages', async () => {
    rpcImpl = async () => ({ data: null, error: { message: 'bad_code' } });
    await expect(api.checkJoinCode('XXXXXX')).rejects.toThrow('コードが見つかりません');
    rpcImpl = async () => ({ data: null, error: { message: 'not_class_teacher' } });
    await expect(api.fetchClassDetail('c1')).rejects.toThrow('このクラスの先生ではありません');
    rpcImpl = async () => ({ data: null, error: { message: 'not_teacher' } });
    await expect(api.searchUsers('ai')).rejects.toThrow('先生のアカウントだけが使えます');
    expect(api.classErrorMessage({ message: 'boom' })).toContain('boom');
    // The thrown error also carries the code, so a screen can react (e.g. reload after teacher_not_in_class).
    rpcImpl = async () => ({ data: null, error: { message: 'teacher_not_in_class' } });
    await expect(api.removeCoTeacher('c1', 't2')).rejects.toMatchObject({ code: 'teacher_not_in_class', message: 'この先生はもうこのクラスにいません。' });
    rpcImpl = async () => ({ data: null, error: { message: 'boom' } });
    await expect(api.removeCoTeacher('c1', 't2')).rejects.toMatchObject({ code: null });
    expect(api.classErrorMessage({ message: 'last_teacher' })).toBe('最後の先生は外せません。先に別の先生を追加してください。');
    expect(api.classErrorMessage({ message: 'teacher_not_in_class' })).toBe('この先生はもうこのクラスにいません。');
  });

  it('join codes: a raised bad_code (older SQL) and a returned one (newer SQL) give the same error', async () => {
    rpcImpl = async () => ({ data: null, error: { message: 'bad_code' } });
    await expect(api.checkJoinCode('XXXXXX')).rejects.toMatchObject({ code: 'bad_code', message: 'コードが見つかりません。もう一度確認してください' });
    rpcImpl = async () => ({ data: { error: 'bad_code' }, error: null });
    await expect(api.checkJoinCode('XXXXXX')).rejects.toMatchObject({ code: 'bad_code', message: 'コードが見つかりません。もう一度確認してください' });
    await expect(api.joinClass('XXXXXX', '山田', null, 'Yama')).rejects.toMatchObject({ code: 'bad_code' });
  });

  it('join codes: too many wrong codes says when to try again (Japan time)', async () => {
    rpcImpl = async () => ({ data: { error: 'too_many_tries', retry_at: '2026-10-31T09:20:00Z' }, error: null });
    await expect(api.checkJoinCode('XXXXXX')).rejects.toMatchObject({ code: 'too_many_tries', message: expect.stringContaining('18:20') });
    await expect(api.joinClass('XXXXXX', '山田', null, 'Yama')).rejects.toMatchObject({ code: 'too_many_tries' });
    const { setLang } = await import('../i18n');
    setLang('en');
    try {
      await expect(api.checkJoinCode('XXXXXX')).rejects.toThrow('You can try again at 18:20.');
    } finally {
      setLang('ja');
    }
  });

  it('join codes: a right code still returns the class', async () => {
    rpcImpl = async () => ({ data: { id: 'c1', name: '1年A組' }, error: null });
    expect(await api.checkJoinCode('ABC234')).toEqual({ id: 'c1', name: '1年A組' });
  });

  it('class_leavers never throws (e.g. before the SQL is run)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rpcImpl = async () => ({ data: null, error: { message: 'function does not exist' } });
    expect(await api.fetchClassLeavers('c1')).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('pre-filled rosters: arguments, never-throw loads, error codes', async () => {
    result = { data: [], error: null };
    calls.length = 0;
    await api.addRosterEntries('c1', [{ student_number: '1', real_name: 'A', email: 'a@b.jp' }], true);
    await api.addRosterEntries('c1', []);
    await api.fetchRosterPending('c1');
    await api.updateRosterEntry('e1', '山田', 3, 'a@b.jp');
    await api.removeRosterEntry('e1');
    await api.claimMyRoster();
    expect(calls).toEqual([
      ['rpc', 'add_roster_entries', { p_class_id: 'c1', p_rows: [{ student_number: '1', real_name: 'A', email: 'a@b.jp' }], p_dry_run: true }],
      ['rpc', 'add_roster_entries', { p_class_id: 'c1', p_rows: [], p_dry_run: false }],
      ['rpc', 'class_roster_pending', { p_class_id: 'c1' }],
      ['rpc', 'update_roster_entry', { p_entry_id: 'e1', p_real_name: '山田', p_student_number: 3, p_email: 'a@b.jp' }],
      ['rpc', 'remove_roster_entry', { p_entry_id: 'e1' }],
      ['rpc', 'claim_my_roster', undefined],
    ]);
    result = { data: [{ class_id: 'c1', pending: 4 }], error: null };
    expect(await api.fetchRosterPendingCounts()).toEqual({ c1: 4 });

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      rpcImpl = async () => ({ data: null, error: { message: 'function does not exist' } });
      expect(await api.fetchRosterPending('c1')).toEqual([]);
      expect(await api.fetchRosterPendingCounts()).toEqual({});
      expect(await api.claimMyRoster()).toEqual([]);
    } finally {
      warn.mockRestore();
    }
    rpcImpl = async () => ({ data: null, error: { message: 'too_many_rows' } });
    await expect(api.addRosterEntries('c1', [])).rejects.toMatchObject({ code: 'too_many_rows', message: '一度に追加できるのは200行までです' });
    rpcImpl = async () => ({ data: null, error: { message: 'roster_email_taken' } });
    await expect(api.updateRosterEntry('e1', 'A', 1, 'a@b.jp')).rejects.toMatchObject({ code: 'roster_email_taken' });
    rpcImpl = async () => ({ data: null, error: { message: 'roster_entry_not_found' } });
    await expect(api.removeRosterEntry('e1')).rejects.toMatchObject({ code: 'roster_entry_not_found' });
  });

  it('is_teacher: true only for a real true; an error counts as no', async () => {
    result = { data: true, error: null };
    expect(await api.fetchIsTeacher()).toBe(true);
    result = { data: null, error: { message: 'x' } };
    expect(await api.fetchIsTeacher()).toBe(false);
  });
});

describe('schools and teacher sign-up (polyvo-schools-phase1.sql)', () => {
  it('calls each database function with the right arguments', async () => {
    result = { data: [], error: null };
    await api.searchSchools('龍谷', 'saga');
    await api.searchSchools('龍谷');
    await api.requestJoinSchool('s1', 'アンドレ先生');
    await api.registerSchool({ name: '新しい中学校', kana: '', prefecture: 'saga', schoolType: 'jhs', displayName: 'A先生' });
    await api.cancelSchoolRequest();
    await api.fetchMySchool();
    await api.decideSchoolRequest('u2', true);
    await api.setSchoolAdmin('u2', false);
    await api.removeSchoolTeacher('u2');
    await api.setSchoolAutoApprove('s1', true);
    await api.fetchAdminSchools();
    await api.adminDecideSchool('s1', true, ['school.ed.jp']);
    await api.adminSetSchoolDomains('s1', []);
    expect(calls).toEqual([
      ['rpc', 'search_schools', { p_query: '龍谷', p_prefecture: 'saga' }],
      ['rpc', 'search_schools', { p_query: '龍谷', p_prefecture: null }],
      ['rpc', 'request_join_school', { p_school_id: 's1', p_display_name: 'アンドレ先生' }],
      ['rpc', 'register_school', { p_name: '新しい中学校', p_kana: null, p_prefecture: 'saga', p_school_type: 'jhs', p_display_name: 'A先生' }],
      ['rpc', 'cancel_school_request', {}],
      ['rpc', 'my_school', {}],
      ['rpc', 'decide_school_request', { p_user: 'u2', p_approve: true }],
      ['rpc', 'set_school_admin', { p_user: 'u2', p_admin: false }],
      ['rpc', 'remove_school_teacher', { p_user: 'u2' }],
      ['rpc', 'set_school_auto_approve', { p_school: 's1', p_on: true }],
      ['rpc', 'admin_schools', {}],
      ['rpc', 'admin_decide_school', { p_school: 's1', p_approve: true, p_domains: ['school.ed.jp'] }],
      ['rpc', 'admin_set_school_domains', { p_school: 's1', p_domains: [] }],
    ]);
    expect(calls.filter((c) => c[0] === 'from')).toEqual([]);
  });

  it('my_school_status never throws (null on an error, e.g. before the SQL is run)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rpcImpl = async () => ({ data: null, error: { message: 'function my_school_status() does not exist' } });
    expect(await api.fetchMySchoolStatus()).toBe(null);
    rpcImpl = async (name) => ({ data: { google: true, is_teacher: false, membership: null, name }, error: null });
    expect(await api.fetchMySchoolStatus()).toMatchObject({ google: true, name: 'my_school_status' });
    warn.mockRestore();
  });

  it('fills in an empty school', async () => {
    result = { data: null, error: null };
    expect(await api.fetchMySchool()).toEqual({ school: null, domains: [], is_admin: false, teachers: [], requests: [] });
    expect(await api.searchSchools('x')).toEqual([]);
    expect(await api.fetchAdminSchools()).toEqual([]);
  });

  it('school errors become friendly messages, with the code', async () => {
    rpcImpl = async () => ({ data: null, error: { message: 'free_mail_domain' } });
    await expect(api.adminDecideSchool('s1', true, ['gmail.com'])).rejects.toMatchObject({
      code: 'free_mail_domain', message: 'Gmailや携帯電話会社などのドメインは、学校のドメインにできません。',
    });
    expect(api.classErrorMessage({ message: 'last_admin' })).toBe('最後の管理者は外せません。先に別の先生を管理者にしてください。');
    expect(api.classErrorMessage({ message: 'student_not_in_school' })).toContain('参加コード');
    expect(api.classErrorMessage({ message: 'google_only' })).toContain('Google');
  });

  it('the longest code wins: target_not_teacher is not read as not_teacher', async () => {
    expect(api.classErrorMessage({ message: 'target_not_teacher' })).toBe(api.classErrorMessage({ message: 'xx target_not_teacher' }));
    rpcImpl = async () => ({ data: null, error: { message: 'target_not_teacher' } });
    await expect(api.addCoTeacher('c1', 't2')).rejects.toMatchObject({ code: 'target_not_teacher' });
    rpcImpl = async () => ({ data: null, error: { message: 'not_teacher' } });
    await expect(api.addCoTeacher('c1', 't2')).rejects.toMatchObject({ code: 'not_teacher' });
  });
});

describe('teacher area phase 2', () => {
  it('calls each database function with the right arguments', async () => {
    result = { data: [], error: null };
    await api.fetchStudentDetail('c1', 's1');
    await api.awardTickets('c1', ['s1', 's2'], 3, 'Nice');
    await api.fetchClassAwards('c1');
    await api.fetchUnseenAwards();
    await api.markAwardsSeen([4, 5]);
    expect(calls).toEqual([
      ['rpc', 'student_detail', { p_class_id: 'c1', p_student_id: 's1' }],
      ['rpc', 'award_tickets', { p_class_id: 'c1', p_student_ids: ['s1', 's2'], p_amount: 3, p_message: 'Nice' }],
      ['rpc', 'class_awards', { p_class_id: 'c1' }],
      ['rpc', 'my_unseen_awards', undefined],
      ['rpc', 'mark_awards_seen', { p_ids: [4, 5] }],
    ]);
  });

  it('fills in a sparse student detail', async () => {
    result = { data: { player_level: 2 }, error: null };
    const d = await api.fetchStudentDetail('c1', 's1');
    expect(d.days).toEqual([]);
    expect(d.level_counts).toHaveLength(9);
    expect(d.totals).toEqual({ reviews: 0, spelled_correctly: 0, bonus_points: 0 });
  });

  it('the student side never throws, and marks nothing when there is nothing', async () => {
    rpcImpl = async (name) => { calls.push(['rpc', name]); return { data: null, error: { message: 'boom' } }; };
    expect(await api.fetchUnseenAwards()).toEqual([]);
    await api.markAwardsSeen([1]);
    calls.length = 0;
    await api.markAwardsSeen([]);
    expect(calls).toEqual([]);
  });

  it('turns award errors into friendly messages', async () => {
    rpcImpl = async () => ({ data: null, error: { message: 'bad_amount' } });
    await expect(api.awardTickets('c1', ['s1'], 11, null)).rejects.toThrow('チケットは1〜10枚');
    rpcImpl = async () => ({ data: null, error: { message: 'not_member' } });
    await expect(api.fetchStudentDetail('c1', 'x')).rejects.toThrow('この生徒はクラスにいません');
  });
});

describe('teacher area phase 3', () => {
  it('calls each database function with the right arguments', async () => {
    result = { data: [], error: null };
    await api.fetchClassOverview('c1', 7, 1000, 30);
    await api.fetchClassTroubleWords('c1', 30);
    result = { data: { tap_answers: 3 }, error: null };
    expect(await api.fetchStudentHonesty('c1', 's1', 30, 1000)).toEqual({ tap_answers: 3 });
    expect(calls).toEqual([
      ['rpc', 'class_overview', { p_class_id: 'c1', p_days: 7, p_fast_ms: 1000, p_honesty_days: 30 }],
      ['rpc', 'class_trouble_words', { p_class_id: 'c1', p_days: 30 }],
      ['rpc', 'student_honesty', { p_class_id: 'c1', p_student_id: 's1', p_days: 30, p_fast_ms: 1000 }],
    ]);
  });

  it('turns a null answer into an empty list or object', async () => {
    result = { data: null, error: null };
    expect(await api.fetchClassOverview('c1', 7, 1000, 30)).toEqual([]);
    expect(await api.fetchClassTroubleWords('c1', 7)).toEqual([]);
    expect(await api.fetchStudentHonesty('c1', 's1', 30, 1000)).toEqual({});
  });

  it('turns errors into friendly messages', async () => {
    rpcImpl = async () => ({ data: null, error: { message: 'not_class_teacher' } });
    await expect(api.fetchClassOverview('c1', 7, 1000, 30)).rejects.toThrow();
    rpcImpl = async () => ({ data: null, error: { message: 'not_member' } });
    await expect(api.fetchStudentHonesty('c1', 'x', 30, 1000)).rejects.toThrow('この生徒はクラスにいません');
  });

  it('record_answer: sends the answer mode and times only when they are set', async () => {
    const SESSION = '11111111-2222-4333-8444-555555555555';
    result = { data: {}, error: null };
    await api.recordAnswer({ wordId: 'w', direction: 'jp2en' }, 'got_it', SESSION, null, { mode: 'tap', revealMs: 640, answerMs: 1900 });
    await api.recordAnswer({ wordId: 'w', direction: 'jp2en' }, 'got_it', SESSION, 'dog', { mode: 'typing', revealMs: null, answerMs: 0 });
    await api.recordAnswer({ wordId: 'w', direction: 'jp2en' }, 'not_yet', SESSION, null, { mode: 'tap', revealMs: null, answerMs: null });
    const base = { p_word_id: 'w', p_direction: 'jp2en', p_session_id: SESSION };
    expect(calls).toEqual([
      ['rpc', 'record_answer', { ...base, p_result: 'got_it', p_mode: 'tap', p_reveal_ms: 640, p_answer_ms: 1900 }],
      ['rpc', 'record_answer', { ...base, p_result: 'got_it', p_typed: 'dog', p_mode: 'typing', p_answer_ms: 0 }],
      ['rpc', 'record_answer', { ...base, p_result: 'not_yet', p_mode: 'tap' }],
    ]);
  });
});

describe('class tab', () => {
  it('calls each database function with the right arguments', async () => {
    result = { data: null, error: null };
    await api.fetchMyClassInfo('c1');
    await api.setMyNickname('c1', 'Yama');
    await api.fetchClassLeaderboard('c1');
    await api.setClassLeaderboard('c1', false);
    await api.setMemberNickname('c1', 's1', '');
    expect(calls).toEqual([
      ['rpc', 'my_class_info', { p_class_id: 'c1' }],
      ['rpc', 'set_my_nickname', { p_class_id: 'c1', p_nickname: 'Yama' }],
      ['rpc', 'class_leaderboard', { p_class_id: 'c1' }],
      ['rpc', 'set_class_leaderboard', { p_class_id: 'c1', p_enabled: false }],
      ['rpc', 'set_member_nickname', { p_class_id: 'c1', p_student_id: 's1', p_nickname: '' }],
    ]);
  });

  it('fills in empty answers', async () => {
    result = { data: null, error: null };
    expect(await api.fetchMyClassInfo('c1')).toEqual({ teachers: [], nickname: null });
    expect(await api.fetchClassLeaderboard('c1')).toEqual({ enabled: false, top: [], last_week: [], me: null, boards: null });
    result = { data: { enabled: false }, error: null };
    expect((await api.fetchClassLeaderboard('c1')).enabled).toBe(false);
    expect((await api.fetchClassLeaderboard('c1')).boards).toBe(null);
  });

  it('shapes the typing / handwriting / reviews boards', async () => {
    const row = { rank: 1, nickname: 'Sora', count: 12, is_me: false, avatar: null };
    result = {
      data: { enabled: true, boards: { typing: { top: [row], more: 2, me: { rank: 1, count: 12 } }, reviews: {} } },
      error: null,
    };
    const { boards } = await api.fetchClassLeaderboard('c1');
    expect(boards.typing).toEqual({ top: [row], more: 2, me: { rank: 1, count: 12 }, last_week: [] });
    expect(boards.handwriting).toEqual({ top: [], more: 0, me: null, last_week: [] });
    expect(boards.reviews).toEqual({ top: [], more: 0, me: null, last_week: [] });
  });

  it('turns nickname errors into friendly messages', async () => {
    rpcImpl = async () => ({ data: null, error: { message: 'nickname_taken' } });
    await expect(api.setMyNickname('c1', 'Aiden')).rejects.toThrow('ニックネームはもう使われています');
    rpcImpl = async () => ({ data: null, error: { message: 'bad_nickname' } });
    await expect(api.joinClass('ABC234', '山田', null, '')).rejects.toThrow('ニックネームは1〜12文字');
  });

  it('a 401 (sign-in lost) says ログインしてください, never the technical message', async () => {
    rpcImpl = async () => ({ data: null, status: 401, error: { code: '42501', message: 'permission denied for function set_my_nickname' } });
    const failure = await api.setMyNickname('c1', 'Aiden').catch((e) => e);
    expect(failure.message).toBe('ログインしてください');
    expect(failure.code).toBe('not_signed_in');
  });
});

describe('teacher area phase 4: assigned packs', () => {
  it('calls each database function with the right arguments', async () => {
    result = { data: null, error: null };
    await api.fetchClassAssignments('c1');
    await api.createAssignment('c1', 'd1', '2026-11-02', 'Quiz');
    await api.createAssignment('c1', 'd2', '', '');
    await api.updateAssignment('a1', null, 'New note');
    await api.deleteAssignment('a1');
    await api.fetchMyClassAssignments('c1');
    await api.fetchPendingAssignments();
    await api.fetchClassAwards('c1', 100);
    expect(calls).toEqual([
      ['rpc', 'assignments_for_class', { p_class_id: 'c1' }],
      ['rpc', 'create_assignment', { p_class_id: 'c1', p_deck_id: 'd1', p_due_date: '2026-11-02', p_note: 'Quiz' }],
      ['rpc', 'create_assignment', { p_class_id: 'c1', p_deck_id: 'd2', p_due_date: null, p_note: null }],
      ['rpc', 'update_assignment', { p_assignment_id: 'a1', p_due_date: null, p_note: 'New note' }],
      ['rpc', 'delete_assignment', { p_assignment_id: 'a1' }],
      ['rpc', 'my_class_assignments', { p_class_id: 'c1' }],
      ['rpc', 'my_pending_assignments', undefined],
      ['rpc', 'class_awards', { p_class_id: 'c1', p_limit: 100 }],
    ]);
  });

  it('fills in empty answers', async () => {
    result = { data: [{ id: 'a1', students: null }], error: null };
    expect(await api.fetchClassAssignments('c1')).toEqual([{ id: 'a1', students: [] }]);
    result = { data: null, error: null };
    expect(await api.fetchMyClassAssignments('c1')).toEqual([]);
    expect(await api.fetchPendingAssignments()).toBe(0);
    result = { data: 3, error: null };
    expect(await api.fetchPendingAssignments()).toBe(3);
  });

  it('the pending count never throws', async () => {
    rpcImpl = async () => ({ data: null, error: { message: 'boom' } });
    expect(await api.fetchPendingAssignments()).toBe(0);
  });

  it('turns assignment errors into friendly messages', async () => {
    rpcImpl = async () => ({ data: null, error: { message: 'already_assigned' } });
    await expect(api.createAssignment('c1', 'd1', null, null)).rejects.toThrow('このパックはもうこのクラスの課題になっています');
    rpcImpl = async () => ({ data: null, error: { message: 'note_too_long' } });
    await expect(api.updateAssignment('a1', null, 'x')).rejects.toThrow('メモは60文字までです');
    rpcImpl = async () => ({ data: null, error: { message: 'assignment_not_found' } });
    await expect(api.deleteAssignment('a1')).rejects.toThrow('この課題は見つかりませんでした');
    rpcImpl = async () => ({ data: null, error: { message: 'not_class_teacher' } });
    await expect(api.fetchClassAssignments('c9')).rejects.toThrow();
  });
});

describe('card reports', () => {
  const DECK = '081656da-63f4-4520-a34f-4d5a11b2938b';
  const REPORT = { wordId: 'w1', direction: 'jp2en', deckId: DECK, source: 'review', reason: 'accept_answer', note: 'hi', submittedAnswer: 'colour', answerMode: 'typing', context: { lang: 'ja' } };

  it('sends a report with every argument and returns its id', async () => {
    result = { data: 'r1', error: null };
    expect(await api.submitCardReport(REPORT)).toBe('r1');
    expect(calls).toEqual([['rpc', 'submit_card_report', {
      p_word_id: 'w1', p_direction: 'jp2en', p_deck_id: DECK, p_source: 'review', p_reason: 'accept_answer',
      p_note: 'hi', p_submitted_answer: 'colour', p_answer_mode: 'typing', p_context: { lang: 'ja' },
    }]]);
  });

  it('sends no deck for the general review (its id is not a deck) and nulls for a word-list report', async () => {
    await api.submitCardReport({ wordId: 'w1', direction: null, deckId: 'review', source: 'word_list', reason: 'other', note: '' });
    expect(calls[0][2]).toMatchObject({ p_deck_id: null, p_direction: null, p_note: null, p_submitted_answer: null, p_answer_mode: null, p_context: null });
  });

  it('throws with the database error code', async () => {
    rpcImpl = async () => ({ data: null, error: { message: 'already_reported' } });
    await expect(api.submitCardReport(REPORT)).rejects.toMatchObject({ code: 'already_reported' });
    rpcImpl = async () => ({ data: null, error: { message: 'report_limit' } });
    await expect(api.submitCardReport(REPORT)).rejects.toMatchObject({ code: 'report_limit' });
    rpcImpl = async () => ({ data: null, error: { message: 'boom' } });
    await expect(api.submitCardReport(REPORT)).rejects.toMatchObject({ code: null });
  });

  it('turns error codes into friendly messages (already_reported is a thank-you)', () => {
    expect(api.reportErrorMessage({ message: 'already_reported' })).toBe('もう報告してあるよ。ありがとう！');
    expect(api.reportErrorMessage({ message: 'report_limit' })).toContain('今日はもう報告できません');
    expect(api.reportErrorMessage({ message: 'boom' })).toContain('報告を送れませんでした');
  });

  it('uploads the screenshot to my own folder as {user}/{report}.jpg, then attaches it', async () => {
    result = { data: null, error: null };
    expect(await api.sendReportScreenshot('r1', 'BLOB')).toBe(true);
    expect(calls).toEqual([
      ['upload', 'report-screenshots', 'u1/r1.jpg', 'BLOB', { contentType: 'image/jpeg', upsert: false }],
      ['rpc', 'attach_report_screenshot', { p_report_id: 'r1', p_path: 'u1/r1.jpg' }],
    ]);
  });

  it('never throws when the screenshot fails (the report still counts)', async () => {
    uploadError = { message: 'bucket full' };
    expect(await api.sendReportScreenshot('r1', 'BLOB')).toBe(false);
    expect(calls.some((c) => c[1] === 'attach_report_screenshot')).toBe(false);
    uploadError = null;
    sessionUser = null;
    expect(await api.sendReportScreenshot('r1', 'BLOB')).toBe(false);
  });
});

describe('settings saved on the account', () => {
  it('reads the own row: null when there is none yet', async () => {
    result = { data: null, error: null };
    expect(await api.fetchUserSettings()).toBeNull();
    expect(calls).toContainEqual(['from', 'user_settings']);
    expect(calls).toContainEqual(['select', 'settings']);
    result = { data: { settings: { lang: 'en' } }, error: null };
    expect(await api.fetchUserSettings()).toEqual({ lang: 'en' });
  });

  it('the first save never overwrites a row another device made', async () => {
    await api.createUserSettings('u1', { lang: 'en' });
    expect(calls).toContainEqual(['upsert', { user_id: 'u1', settings: { lang: 'en' } }, { onConflict: 'user_id', ignoreDuplicates: true }]);
  });

  it('later saves replace the row and go out in order', async () => {
    const first = api.saveUserSettings('u1', { lang: 'en' });
    const second = api.saveUserSettings('u1', { lang: 'ja' });
    await Promise.all([first, second, api.waitForSettingsSaves()]);
    const upserts = calls.filter((c) => c[0] === 'upsert');
    expect(upserts.map((c) => c[1].settings.lang)).toEqual(['en', 'ja']);
    expect(upserts[0][2]).toEqual({ onConflict: 'user_id' });
  });

  it('a failed save throws, and the next one still goes out', async () => {
    result = { data: null, error: { message: 'offline' } };
    await expect(api.saveUserSettings('u1', { lang: 'en' })).rejects.toThrow('offline');
    result = { data: null, error: null };
    await expect(api.saveUserSettings('u1', { lang: 'ja' })).resolves.toBeUndefined();
  });
});

describe('dictionary', () => {
  it('loads the slim search index in pages, without examples or audio', async () => {
    result = { data: [{ id: 'a', english: 'eat' }], error: null, count: 1 };
    expect(await api.fetchDictionaryIndex()).toEqual([{ id: 'a', english: 'eat' }]);
    const select = calls.find((c) => c[0] === 'select');
    expect(select[1]).toBe('id, english, japanese, reading, pos, alt_answers');
    expect(calls).toContainEqual(['range', 0, 999]);
  });

  it('keeps reading pages until every word is loaded (no fixed page count)', async () => {
    const pages = () => calls.filter((c) => c[0] === 'range').length; // pages asked for so far
    const rows = (n, from) => Array.from({ length: n }, (_, i) => ({ id: `w${from + i}` }));
    result = { error: null, count: 6500 };
    Object.defineProperty(result, 'data', { get: () => (pages() === 1 ? rows(1000, 0) : rows(1000, 1000)) });
    const words = await api.fetchDictionaryIndex();
    expect(words).toHaveLength(7000); // 1 + 6 pages of the fake's 1,000 rows
    expect(pages()).toBe(7);
    expect(calls).toContainEqual(['range', 6000, 6999]);
  });

  it('loads one word with its decks and only my own cards', async () => {
    result = { data: [{ deck_id: 'd1' }, { deck_id: 'd1' }], error: null };
    const out = await api.fetchDictionaryWord('w1', 'u1');
    expect(out.deckIds).toEqual(['d1']);
    expect(calls).toContainEqual(['from', 'deck_words']);
    expect(calls).toContainEqual(['eq', 'user_id', 'u1']);
    expect(calls).toContainEqual(['eq', 'word_id', 'w1']);
  });

  it('throws when a part fails', async () => {
    result = { data: null, error: { message: 'boom' } };
    await expect(api.fetchDictionaryWord('w1', 'u1')).rejects.toThrow('boom');
  });
});

describe('single words (dictionary phase 2)', () => {
  // A fake whose answer depends on the table of the latest query.
  function answerByTable(answers) {
    const last = () => [...calls].reverse().find((c) => c[0] === 'from')?.[1];
    result = { error: null, count: 0 };
    Object.defineProperty(result, 'data', { get: () => answers[last()] ?? [] });
  }
  const deletesOn = (table) => {
    const out = [];
    let current = null;
    for (const c of calls) {
      if (c[0] === 'from') current = c[1];
      if (c[0] === 'delete' && current === table) out.push(c);
    }
    return out.length;
  };
  const inLists = (column) => calls.filter((c) => c[0] === 'in' && c[1] === column).map((c) => c[2]);

  it('due rows say which words were added on their own', async () => {
    await fetchDueRows();
    expect(calls.find((c) => c[0] === 'select')[1]).toContain('user_words ( word_id )');
  });

  it('reviews the single words with an inner join on user_words and no deck filter', async () => {
    await fetchReviewRows('single-words', 20);
    const select = calls.find((c) => c[0] === 'select')[1];
    expect(select).toContain('user_words!inner ( word_id )');
    expect(select).not.toContain('deck_words');
    expect(calls.some((c) => c[0] === 'eq' && c[1] === 'words.deck_words.deck_id')).toBe(false);
  });

  it('adding a word makes its two Lv0 cards (keeping existing ones) and a user_words row', async () => {
    await api.addWordToMyCards('u1', 'w1');
    expect(calls).toContainEqual(['from', 'user_cards']);
    const upserts = calls.filter((c) => c[0] === 'upsert');
    expect(upserts[0][1]).toEqual([
      { user_id: 'u1', word_id: 'w1', direction: 'en2jp' },
      { user_id: 'u1', word_id: 'w1', direction: 'jp2en' },
    ]);
    expect(upserts[0][2]).toMatchObject({ ignoreDuplicates: true });
    expect(upserts[1][1]).toEqual({ user_id: 'u1', word_id: 'w1' });
    expect(calls.some((c) => c[0] === 'update')).toBe(false);
  });

  it('removing single words keeps the progress of words still in an added pack', async () => {
    answerByTable({ user_words: [{ word_id: 'a' }, { word_id: 'b' }], user_decks: [{ deck_id: 'd1' }], deck_words: [{ word_id: 'a' }] });
    await api.removeSingleWords('u1');
    expect(deletesOn('user_cards')).toBe(1);
    expect(inLists('word_id')).toContainEqual(['b']); // only b loses its progress
    expect(deletesOn('user_words')).toBe(1);
    expect(inLists('word_id').at(-1)).toEqual(['a', 'b']);
  });

  it('removing one single word filters to that word', async () => {
    answerByTable({ user_words: [{ word_id: 'a' }], user_decks: [] });
    await api.removeSingleWords('u1', 'a');
    expect(calls).toContainEqual(['eq', 'word_id', 'a']);
    expect(deletesOn('user_cards')).toBe(1);
    expect(deletesOn('user_words')).toBe(1);
  });

  it('removing a pack keeps words also added on their own', async () => {
    answerByTable({ deck_words: [{ word_id: 'a' }, { word_id: 'b' }], user_decks: [], user_words: [{ word_id: 'a' }] });
    // The fake's user_decks delete returns no row, so the function ends with its "not removed" error.
    await expect(api.removeDeckFromMyCards('u1', 'd1')).rejects.toThrow('Deck was not removed');
    expect(calls).toContainEqual(['from', 'user_words']);
    expect(inLists('word_id').at(-1)).toEqual(['b']); // the user_cards delete: only b
  });

  it('the pop-up knows whether a word was added on its own', async () => {
    answerByTable({ user_words: [{ word_id: 'w1' }], user_cards: [{ direction: 'en2jp', level: 0 }] });
    expect((await api.fetchDictionaryWord('w1', 'u1')).single).toBe(true);
    answerByTable({ user_words: [] });
    expect((await api.fetchDictionaryWord('w1', 'u1')).single).toBe(false);
  });
});

describe('word details columns (phase 3)', () => {
  it('asks for countable / plural / verb forms', async () => {
    await api.fetchDictionaryWord('w1', 'u1');
    expect(calls.filter((c) => c[0] === 'select').map((c) => c[1])).toContainEqual(
      'id, example_en, example_ja, audio_path, countable, plural, verb_past, verb_pp, verb_ing, verb_third');
  });

  it('asks again without them before the SQL is run (error 42703)', async () => {
    let first = true;
    result = { data: null, count: 0 };
    // The first answer read is the details query's (it is awaited first): the column is missing.
    Object.defineProperty(result, 'error', { get: () => {
      if (first) { first = false; return { code: '42703', message: 'column words.countable does not exist' }; }
      return null;
    } });
    await api.fetchDictionaryWord('w1', 'u1');
    expect(calls.filter((c) => c[0] === 'select').map((c) => c[1])).toContainEqual('id, example_en, example_ja, audio_path');
  });
});

describe('training rewards', () => {
  it('reads the claimed ids from training_rewards as a Set', async () => {
    result = { data: [{ reward_id: 'abc-upper' }], error: null };
    const rewards = await api.fetchTrainingRewards();
    expect([...rewards]).toEqual(['abc-upper']);
    expect(calls).toEqual([['from', 'training_rewards'], ['select', 'reward_id']]);
  });

  it('null (never throws) when the table can\'t be read, so the reward stays hidden', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    result = { data: null, error: { message: 'relation "training_rewards" does not exist' } };
    expect(await api.fetchTrainingRewards()).toBeNull();
    err.mockRestore();
  });

  it('claims only through claim_training_reward', async () => {
    result = { data: { claimed: true, already: false }, error: null };
    expect(await api.claimTrainingReward('abc-lower')).toEqual({ claimed: true, already: false });
    expect(calls).toEqual([['rpc', 'claim_training_reward', { p_reward_id: 'abc-lower' }]]);
    result = { data: { claimed: true, already: true }, error: null };
    expect((await api.claimTrainingReward('abc-lower')).already).toBe(true);
  });

  it('throws with .code and a friendly message', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    result = { data: null, error: { message: 'not_complete' } };
    await expect(api.claimTrainingReward('abc-upper')).rejects.toMatchObject({ code: 'not_complete' });
    result = { data: null, error: { message: 'network down' } };
    await expect(api.claimTrainingReward('abc-upper')).rejects.toMatchObject({ code: null });
    err.mockRestore();
  });
});
