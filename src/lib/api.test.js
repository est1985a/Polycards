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
  fetchDueRows, fetchReviewRows, fetchDeckWords, fetchMasteredCards, restoreMasteredCard, recordAnswer, waitForPendingSaves, holdAnswer, flushHeldAnswer, dropHeldAnswer, checkOtherMeaning, fetchBonusPoints, fetchNextReview, fetchReviewPlanRows,
  fetchCollections, fetchGachaStatus, pullGacha, fetchGachaCollection, equipAvatar, setGachaTheme, gachaErrorMessage, fetchThemeUnlocks,
  fetchSeenThemeUnlocks, markThemeUnlocksSeen, fetchTrainingProgress, recordTrainingCompletion,
  fetchStudyDays, fetchStudyTotals, fetchTroubleWords, addDeckToMyCards, fetchOwnedWordIds,
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
