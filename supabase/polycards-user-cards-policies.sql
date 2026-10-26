-- =====================================================================
-- Polycards: the RLS policy on user_cards, as it is in Supabase (2026-10-26)
-- It was created in the Supabase dashboard; this file only records it in
-- the repo (copied from pg_policies). Running it changes nothing: it drops
-- and re-creates the same policy.
--
-- Note: "ALL" lets a student insert, update and delete their own rows with
-- any values (level, next_review_at, mastered_at), not just through
-- record_answer(). The app needs insert (adding a deck), delete (removing
-- a deck) and update (putting a Mastered card back). Tightening this is
-- planned with server-computed peak points.
-- =====================================================================

alter table public.user_cards enable row level security;

drop policy if exists "Users manage own card progress" on public.user_cards;
create policy "Users manage own card progress" on public.user_cards
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
