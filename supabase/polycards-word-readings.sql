-- =====================================================================
-- Polycards: hiragana readings for words (for kana search)
-- Run once in the Supabase SQL editor. Safe to run twice.
--
-- Adds words.reading: the japanese field written in hiragana, so a future
-- dictionary search can find 食べる when a student types たべる.
-- NULL = not filled in yet. The app does not read it yet; the Deck Import
-- Tool (tools/deck-import-tool.html) fills it in, only where it is NULL.
-- supabase/check-word-readings.sql lists the words that still need one.
-- No RLS or grant change: words is already readable, and the existing
-- read policies cover the new column. No index (the library is small;
-- search will be done in the app).
-- =====================================================================

alter table public.words add column if not exists reading text;

comment on column public.words.reading is
  'Hiragana reading of the japanese field, for kana search. Same text as japanese with kanji and katakana written in hiragana; punctuation, ～, brackets and numbers-as-words kept in the same places. Null = not filled in yet.';

-- So the Deck Import Tool's read-only look-up sees the new column at once.
notify pgrst, 'reload schema';

-- Optional check (read-only, remove the -- to run): who can read words.
-- A row with privilege_type SELECT for anon / authenticated means the whole
-- table is granted, so the new column is readable too.
-- select grantee, privilege_type from information_schema.role_table_grants
-- where table_schema = 'public' and table_name = 'words';
