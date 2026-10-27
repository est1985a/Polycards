-- =====================================================================
-- Polycards: when each Polyavatar was obtained (入手日), 2026-10-27
-- Run once in the Supabase SQL editor, after polycards-gacha.sql.
-- Safe to run twice. The app works without it (starters then show the
-- day the student first opened the app instead of the sign-up day).
--
-- user_avatars.obtained_at already exists (timestamptz, NOT NULL,
-- default now(), stored in UTC), so there is no new column and no row
-- without a date:
--   - gacha pull:          the row is inserted at the pull → time of the pull
--   - granted by hand:     insert into public.user_avatars (user_id, avatar_id) values (…)
--                          → time it was granted (the default)
--   - starter Polyavatar:  inserted by gacha_ensure() the first time the app
--                          calls a gacha function. This file makes it the
--                          account's creation time (auth.users.created_at).
-- The app shows it in Japan time (src/lib/gacha.js obtainedDate()).
-- =====================================================================

-- 1. Backfill: existing starter Polyavatars get the account's creation time.
update public.user_avatars ua
set obtained_at = u.created_at
from auth.users u, public.avatars a
where ua.user_id = u.id
  and a.id = ua.avatar_id
  and a.is_starter
  and u.created_at is not null
  and ua.obtained_at is distinct from u.created_at;


-- 2. New starter rows: the date is the account's creation time, not the
--    moment gacha_ensure() happened to write the row.
create or replace function public.user_avatars_starter_date()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_created timestamptz;
begin
  if exists (select 1 from public.avatars a where a.id = new.avatar_id and a.is_starter) then
    select u.created_at into v_created from auth.users u where u.id = new.user_id;
    new.obtained_at := coalesce(v_created, new.obtained_at);
  end if;
  return new;
end;
$$;

drop trigger if exists user_avatars_starter_date on public.user_avatars;
create trigger user_avatars_starter_date
  before insert on public.user_avatars
  for each row execute function public.user_avatars_starter_date();


-- 3. Once set, the date never changes (created AFTER the backfill above,
--    so the backfill isn't blocked). Duplicates can't happen anyway:
--    the primary key is (user_id, avatar_id), gacha_pull() only picks
--    Polyavatars the student doesn't own, and the starter insert is
--    "on conflict do nothing".
create or replace function public.user_avatars_keep_obtained_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.obtained_at := old.obtained_at;
  return new;
end;
$$;

drop trigger if exists user_avatars_keep_obtained_at on public.user_avatars;
create trigger user_avatars_keep_obtained_at
  before update on public.user_avatars
  for each row execute function public.user_avatars_keep_obtained_at();

-- The trigger functions are only for the triggers.
revoke execute on function public.user_avatars_starter_date(), public.user_avatars_keep_obtained_at()
  from public, anon, authenticated;

-- Reading: unchanged. Policy "Read own avatars" (select, user_id = auth.uid())
-- and the app reads obtained_at through gacha_collection() (own rows only).
