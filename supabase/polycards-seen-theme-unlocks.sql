-- =====================================================================
-- Polycards: which "new theme unlocked" pop-ups a student has seen,
-- saved on the account (2026-10-26)
-- Run once in the Supabase SQL editor, after polycards-gift-tickets.sql
-- and BEFORE deploying the app code that uses it (until then the pop-up
-- and the account-menu dot simply don't show).
--
-- Before this, the seen list lived only in the browser (localStorage), so
-- a preview link, a new device or cleared site data showed the pop-up again.
--
-- user_gacha.seen_theme_unlocks: theme keys the student has been told about.
-- The app only goes through the two functions below.
-- Safe to run twice.
-- =====================================================================

-- 1. The column
alter table public.user_gacha
  add column if not exists seen_theme_unlocks text[] not null default '{}';


-- 2. Backfill: everyone counts as having seen every theme they have already
--    reached (unlock rank above 1, at or below their rank now), so nobody
--    gets an old pop-up again. Merged with anything already saved.
--    A new user_gacha row gives no tickets or avatars by itself (tickets are
--    worked out from counters that start at 0); gacha_ensure() adds the
--    starter avatar the next time the student opens the app, as usual.
insert into public.user_gacha (user_id, seen_theme_unlocks)
select u.id,
       coalesce(array(select t.theme_key from public.theme_unlocks t
                      where t.unlock_level > 1
                        and t.unlock_level <= public.gacha_player_level(u.id)
                      order by t.unlock_level, t.theme_key), '{}')
from auth.users u
on conflict (user_id) do update
  set seen_theme_unlocks = array(
        select distinct k from unnest(public.user_gacha.seen_theme_unlocks || excluded.seen_theme_unlocks) k
        order by k);


-- 3. The student's seen list.
create or replace function public.seen_theme_unlocks()
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_seen text[];
begin
  if v_user is null then raise exception 'not_signed_in'; end if;
  perform public.gacha_ensure(v_user);
  select g.seen_theme_unlocks into v_seen from public.user_gacha g where g.user_id = v_user;
  return coalesce(v_seen, '{}');
end;
$$;


-- 4. Mark themes as seen (keys that aren't real themes are ignored). Returns the new list.
create or replace function public.mark_theme_unlocks_seen(p_keys text[])
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_seen text[];
begin
  if v_user is null then raise exception 'not_signed_in'; end if;
  perform public.gacha_ensure(v_user);
  update public.user_gacha g
  set seen_theme_unlocks = array(
        select distinct k from unnest(g.seen_theme_unlocks || array(
          select t.theme_key from public.theme_unlocks t where t.theme_key = any(coalesce(p_keys, '{}'))
        )) k
        order by k),
      updated_at = now()
  where g.user_id = v_user
  returning g.seen_theme_unlocks into v_seen;
  return coalesce(v_seen, '{}');
end;
$$;

revoke execute on function public.seen_theme_unlocks(), public.mark_theme_unlocks_seen(text[])
  from public, anon, authenticated;
grant execute on function public.seen_theme_unlocks(), public.mark_theme_unlocks_seen(text[])
  to authenticated;
