-- =====================================================================
-- Polycards: word details for the dictionary pop-up (2026-11-04)
-- Adds empty columns to public.words; the data comes later in the batch files
-- supabase/word-details-nouns-N.sql and word-details-verbs-N.sql.
-- Can be run before or after the app code (the app works without these columns
-- and shows each section only when its data is filled in). Safe to run twice.
--
-- countable  = 'countable'   数えられる (a dog, two dogs)
--              'uncountable' 数えられない (water, information)
--              'both'        両方 (paper 紙 / a paper 新聞)
--              'plural'      常に複数形 (jeans, scissors)
--              NULL          not filled in, or a proper noun (Japan, July): no chip
-- plural     = the plural form (dogs, children), for countable / both nouns
-- verb_past, verb_pp, verb_ing, verb_third = went, gone, going, goes
--
-- The library is read-only for students (no grant change needed: the table is readable).
-- =====================================================================

alter table public.words add column if not exists countable  text;
alter table public.words add column if not exists plural     text;
alter table public.words add column if not exists verb_past  text;
alter table public.words add column if not exists verb_pp    text;
alter table public.words add column if not exists verb_ing   text;
alter table public.words add column if not exists verb_third text;

alter table public.words drop constraint if exists words_countable_check;
alter table public.words add constraint words_countable_check
  check (countable is null or countable in ('countable', 'uncountable', 'both', 'plural'));


-- ---------------------------------------------------------------------
-- Snippets (run on their own when needed)
-- ---------------------------------------------------------------------
-- A. How much is filled in:
-- select count(*) filter (where pos = 'noun') as nouns,
--        count(*) filter (where countable is not null) as with_countable,
--        count(*) filter (where pos = 'verb') as verbs,
--        count(*) filter (where verb_past is not null) as with_verb_forms
-- from public.words;
--
-- B. Fix one word by hand:
-- update public.words set countable = 'both', plural = 'papers' where english = 'paper' and japanese = '紙';
