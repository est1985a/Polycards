-- =====================================================================
-- Polycards: peak points calculated and saved by the database only (2026-10-31)
--
-- Before: the app added up the card points in the browser and saved
-- user_stats.peak_points itself, and a student could write their own
-- user_stats row and their own card levels (user_cards) with any value.
--
-- After:
--   * card_points(level) = the same table as CARD_POINTS in src/lib/srs.js
--     (Lv0 0, Lv1 1, Lv2 2, Lv3 3, Lv4 5, Lv5 8, Lv6 13, Lv7 21, Mastered 34).
--   * Whenever a card's level goes UP (record_answer), a trigger on user_cards
--     recalculates the student's card total and saves
--     peak = greatest(old peak, total). The peak never goes down.
--   * Students can only READ user_stats (no insert / update / delete).
--   * A direct write to user_cards from the browser can no longer raise a level:
--     new rows must start at Lv0, and an update may only keep or lower the
--     level (adding / removing a pack and 復習に戻す still work). Only
--     record_answer (and the SQL editor) can move a card up.
--   * Every existing account is brought up to date (a higher saved peak is kept).
--
-- Rank (gacha_player_level) and the gacha ticket rules are NOT changed: they
-- still read user_stats.peak_points + the spelling bonus.
--
-- Run AFTER supabase/check-peak-points.sql PART A says no rank drops, and
-- AFTER the app code that no longer saves the peak is deployed (the old app
-- would get "permission denied" when it tries to save it).
-- Safe to run twice.
-- =====================================================================

-- 1. Points for one card at a level (keep in step with CARD_POINTS in src/lib/srs.js).
create or replace function public.card_points(p_level int)
returns int
language sql
immutable
set search_path = ''
as $$
  select coalesce((array[0, 1, 2, 3, 5, 8, 13, 21, 34])[p_level + 1], 0)
$$;

-- 2. A student's current card total (both directions of a word count separately).
create or replace function public.card_points_total(p_user uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(public.card_points(c.level)), 0)::int
  from public.user_cards c
  where c.user_id = p_user
$$;

-- 3. Save peak = greatest(saved peak, current total). Creates the row if missing.
create or replace function public.refresh_peak_points(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.user_stats (user_id, peak_points, updated_at)
  values (p_user, public.card_points_total(p_user), now())
  on conflict (user_id) do update
    set peak_points = greatest(public.user_stats.peak_points, excluded.peak_points),
        updated_at  = now()
$$;

-- Internal helpers: nobody calls them through the API.
revoke all on function public.card_points_total(uuid)   from public, anon, authenticated;
revoke all on function public.refresh_peak_points(uuid) from public, anon, authenticated;

-- 4. Trigger: a card's level went up → refresh that student's peak.
--    (The total can only beat the peak when a level rises, so new Lv0 cards,
--    misses, 復習に戻す and removed packs don't run it.)
create or replace function public.user_cards_refresh_peak()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_peak_points(new.user_id);
  return null;
end $$;

revoke all on function public.user_cards_refresh_peak() from public, anon, authenticated;

drop trigger if exists user_cards_peak_on_insert on public.user_cards;
create trigger user_cards_peak_on_insert
  after insert on public.user_cards
  for each row when (new.level > 0)
  execute function public.user_cards_refresh_peak();

drop trigger if exists user_cards_peak_on_level_up on public.user_cards;
create trigger user_cards_peak_on_level_up
  after update of level on public.user_cards
  for each row when (new.level > old.level)
  execute function public.user_cards_refresh_peak();

-- 5. Guard: a direct write from the browser can't raise a card's level.
--    NOT security definer on purpose: current_user is then the caller.
--    The browser runs as 'authenticated' (or 'anon'); record_answer is
--    SECURITY DEFINER (owner postgres) and the SQL editor is postgres, so
--    both pass.
create or replace function public.user_cards_guard_level()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      if new.level <> 0 or new.mastered_at is not null then
        raise exception 'level_locked' using hint = 'New cards start at level 0.';
      end if;
    elsif new.level > old.level
       or (new.mastered_at is not null and new.mastered_at is distinct from old.mastered_at) then
      raise exception 'level_locked' using hint = 'Levels only go up through record_answer.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists user_cards_guard_level on public.user_cards;
create trigger user_cards_guard_level
  before insert or update on public.user_cards
  for each row
  execute function public.user_cards_guard_level();

-- 6. Students may only read user_stats.
drop policy if exists "own stats insert" on public.user_stats;
drop policy if exists "own stats update" on public.user_stats;
revoke insert, update, delete, truncate on public.user_stats from anon, authenticated;
revoke insert (user_id, peak_points, updated_at), update (user_id, peak_points, updated_at)
  on public.user_stats from anon, authenticated;
grant select on public.user_stats to authenticated;
-- "own stats select" (each student reads their own row) stays as it is.

-- 7. Bring every existing account up to date (a higher saved peak is kept).
select public.refresh_peak_points(u.user_id)
from (select distinct c.user_id from public.user_cards c) u;

-- 8. Look: should be one row per student, peak >= total for everyone.
select s.user_id, s.peak_points, public.card_points_total(s.user_id) as card_total,
       s.peak_points >= public.card_points_total(s.user_id) as ok
from public.user_stats s
order by s.peak_points desc;
