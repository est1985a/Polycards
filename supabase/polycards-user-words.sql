-- =====================================================================
-- Polycards: single words added to My Deck from the dictionary (2026-11-04)
-- Run once in the Supabase SQL editor, BEFORE deploying the app code that reads it
-- (the app's due counts and the dictionary pop-up read this table). Safe to run twice.
-- Nothing else changes: the live app works the same before and after.
--
-- One row per student and word added on its own (the dictionary pop-up's
-- ＋ マイデッキに追加). The cards themselves are the usual user_cards rows (two per word,
-- Lv0, added the same way as a pack's); this table only remembers that the student
-- added the word by itself, so:
--   - removing a pack never deletes a word the student also added on its own,
--   - My Deck can show the words as one 追加した単語 row and review them.
--
-- Students read, add and remove only their own rows (no update). A word that is
-- deleted from the library, or an account that is deleted, takes its rows with it.
-- =====================================================================

create table if not exists public.user_words (
  user_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  word_id  uuid not null references public.words(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (user_id, word_id)
);
create index if not exists user_words_word_id_idx on public.user_words (word_id);

alter table public.user_words enable row level security;

drop policy if exists "Read own single words" on public.user_words;
create policy "Read own single words" on public.user_words
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Add own single words" on public.user_words;
create policy "Add own single words" on public.user_words
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Remove own single words" on public.user_words;
create policy "Remove own single words" on public.user_words
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.user_words from anon, authenticated;
grant select, insert, delete on public.user_words to authenticated;


-- ---------------------------------------------------------------------
-- Snippets (run on their own when needed)
-- ---------------------------------------------------------------------
-- A. Who added which single words, newest first:
-- select uw.added_at, coalesce(u.raw_user_meta_data->>'username', u.email) as student, w.english, w.japanese
-- from public.user_words uw
-- join auth.users u on u.id = uw.user_id
-- join public.words w on w.id = uw.word_id
-- order by uw.added_at desc limit 100;
--
-- B. How many single words each student has:
-- select coalesce(u.raw_user_meta_data->>'username', u.email) as student, count(*) as words
-- from public.user_words uw join auth.users u on u.id = uw.user_id
-- group by 1 order by 2 desc;
