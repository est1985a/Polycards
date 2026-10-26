-- =====================================================================
-- Polycards: parts of speech (品詞) for words
-- Run once in the Supabase SQL editor, BEFORE deploying the app code that
-- selects words.pos (the app's word queries fail until the column exists).
--
-- Adds words.pos: one part-of-speech key per word, or NULL (no part of
-- speech yet: the app then shows no chip). The keys are the ones in
-- src/lib/partsOfSpeech.js (POS_KEYS); keep the two lists in step.
-- No RLS or grant change: words is already readable, and the existing
-- read policies cover the new column.
-- =====================================================================

alter table public.words add column if not exists pos text;

alter table public.words drop constraint if exists words_pos_check;
alter table public.words add constraint words_pos_check check (
  pos is null or pos in (
    'noun', 'verb', 'adjective', 'adverb', 'preposition', 'pronoun',
    'conjunction', 'auxiliary', 'article', 'interjection', 'number', 'phrase'
  )
);

-- Filling it in (example, run separately):
-- update public.words set pos = 'noun' where english = 'dog';
-- update public.words set pos = 'phrase' where english = 'thank you';
