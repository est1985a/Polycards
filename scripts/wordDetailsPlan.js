// Rules for drafting the dictionary's word-detail batches (used by wordDetails.mjs). Pure functions,
// tested in wordDetailsPlan.test.js.
//
// fixes.json = { nouns: { <word id>: fix }, verbs: { <word id>: fix } }, the hand-checked changes to
// the drafted rows. A fix may have: w (english + japanese, only so a person can read the file),
// skip: true (not a candidate after all), include: true (a candidate the rules missed),
// countable / plural (nouns: null = write nothing, e.g. a proper noun), past / pp / ing / third (verbs).
import { pluralOf, verbForms } from './wordForms.js';
import { toCsv as csvText } from '../src/lib/csv.js';

export const BATCH_SIZE = 350;

const PAST_FORM = /[A-Za-z][A-Za-z' ・]*?の過去(?:形|分詞)/; // 「Xの過去形」「Xの過去分詞」
const KATAKANA_ONLY = /^[゠-ヿー]+$/;
const VERB_END = /(する|[うくぐすつぬぶむる])$/; // する or an う-row kana
const NOT_NOUN_END = /[のないだ]$/; // の な い だ: adjectives and the like

// The meanings of a japanese text, notes in （）removed, ～ … ・ and spaces removed (katakana kept).
export function meaningSegments(japanese) {
  return (japanese || '').normalize('NFKC')
    .replace(/\([^)]*\)/g, '')
    .split(/[、,;/]/)
    .map((s) => s.replace(/[～~〜…・\s]/g, ''))
    .filter(Boolean);
}

export const isPastForm = (word) => PAST_FORM.test((word.japanese || '').normalize('NFKC'));
// A meaning that reads as a noun: katakana only (サッカー), or not ending like a verb or adjective.
export const nounSegment = (s) => KATAKANA_ONLY.test(s) || (!VERB_END.test(s) && !NOT_NOUN_END.test(s));
// A meaning that reads as a verb: ends in する or an う-row kana, never katakana only.
export const verbSegment = (s) => !KATAKANA_ONLY.test(s) && VERB_END.test(s);

// The words of one kind that get details, sorted A–Z (then by id, so the order never changes).
export function candidates(words, kind, fixes = {}) {
  const own = fixes[kind] || {};
  return words
    .filter((w) => {
      const fix = own[w.id];
      if (fix?.skip) return false;
      if (fix?.include) return true;
      if (isPastForm(w)) return false;
      const segs = meaningSegments(w.japanese);
      if (kind === 'nouns') return w.pos === 'noun' || (w.pos === 'verb' && segs.some(nounSegment));
      return w.pos === 'verb' || (w.pos === 'noun' && segs.some(verbSegment));
    })
    .sort((a, b) => a.english.toLowerCase().localeCompare(b.english.toLowerCase()) || (a.id < b.id ? -1 : 1));
}

// The English to build forms from: no ( ) words, no ~ / ..., spaces tidied.
export function formBase(english) {
  return (english || '').replace(/\([^)]*\)/g, ' ').replace(/[~～]|\.{2,}|…/g, ' ').replace(/\s+/g, ' ').trim();
}

// One drafted row: nouns { id, english, japanese, countable, plural }, verbs { id, english, japanese,
// past, pp, ing, third }. A proper noun (capital first letter, not T-shirt) has no countable.
export function draftRow(word, kind, fixes = {}) {
  const fix = (fixes[kind] || {})[word.id] || {};
  const base = formBase(word.english);
  if (kind === 'nouns') {
    const proper = /^[A-Z]/.test(base) && !/^[A-Z]-/.test(base);
    const countable = 'countable' in fix ? fix.countable : proper ? null : 'countable';
    const plural = 'plural' in fix ? fix.plural
      : countable === 'countable' || countable === 'both' ? pluralOf(base) : null;
    return { id: word.id, english: word.english, japanese: word.japanese, countable, plural };
  }
  const forms = verbForms(base) || {};
  return {
    id: word.id, english: word.english, japanese: word.japanese,
    past: fix.past ?? forms.past, pp: fix.pp ?? forms.pp, ing: fix.ing ?? forms.ing, third: fix.third ?? forms.third,
  };
}

const sqlText = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);

// The batch's SQL: one update from a values list, only into empty columns (safe to run twice), then a
// count of what is filled in. Rows with nothing to write (a proper noun) are left out.
export function toSql(rows, kind, name, label) {
  const nouns = kind === 'nouns';
  const useful = rows.filter((r) => (nouns ? r.countable : r.past));
  const values = useful.map((r) => nouns
    ? `  (${sqlText(r.id)}::uuid, ${sqlText(r.countable)}, ${sqlText(r.plural)})  -- ${r.english.replace(/\n/g, ' ')}`
    : `  (${sqlText(r.id)}::uuid, ${sqlText(r.past)}, ${sqlText(r.pp)}, ${sqlText(r.ing)}, ${sqlText(r.third)})  -- ${r.english.replace(/\n/g, ' ')}`);
  // A comment after the last value would swallow nothing, but the commas must sit before the comments.
  const body = values.map((line, i) => line.replace('  --', `${i < values.length - 1 ? ',' : ''}  --`)).join('\n');
  const header = [
    '-- =====================================================================',
    `-- Polycards: dictionary word details, ${kind} (${label}), ${useful.length} words`,
    '-- Run AFTER polycards-word-details.sql. Only fills empty columns, so it is safe to run twice',
    '-- and never overwrites a word fixed by hand. Readable list: the .csv file with the same name.',
    `-- Made by: node scripts/wordDetails.mjs ${name.replace('word-details-', '').replace('-', ' ')}`,
    '-- =====================================================================',
    '',
  ].join('\n');
  const update = nouns
    ? `update public.words as w
set countable = v.countable, plural = v.plural
from (values
${body}
) as v(id, countable, plural)
where w.id = v.id and w.countable is null and w.plural is null;`
    : `update public.words as w
set verb_past = v.past, verb_pp = v.pp, verb_ing = v.ing, verb_third = v.third
from (values
${body}
) as v(id, past, pp, ing, third)
where w.id = v.id and w.verb_past is null and w.verb_pp is null and w.verb_ing is null and w.verb_third is null;`;
  const ids = useful.map((r) => sqlText(r.id) + '::uuid').join(', ');
  const check = nouns
    ? `select count(*) as words_in_batch, count(countable) as with_countable, count(plural) as with_plural from public.words where id in (${ids});`
    : `select count(*) as words_in_batch, count(verb_past) as with_verb_forms from public.words where id in (${ids});`;
  return `${header}${update}\n\n-- Check (words_in_batch and with_${nouns ? 'countable' : 'verb_forms'} should both be ${useful.length}):\n${check}\n`;
}

const COUNTABLE_JA = { countable: '数えられる', uncountable: '数えられない', both: '数えられる・数えられない', plural: '常に複数形' };

// The readable list (UTF-8 with BOM, opens in Excel / Numbers).
export function toCsv(rows, kind) {
  if (kind === 'nouns') {
    return csvText(['english', 'japanese', 'countable', '数えられる？', 'plural'],
      rows.map((r) => [r.english, r.japanese, r.countable ?? '', COUNTABLE_JA[r.countable] ?? '（なし）', r.plural ?? '']));
  }
  return csvText(['english', 'japanese', 'past', 'past participle', '-ing', '-s'],
    rows.map((r) => [r.english, r.japanese, r.past, r.pp, r.ing, r.third]));
}
