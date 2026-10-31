-- =====================================================================
-- Polycards: settings saved on the student's account (2026-10-31)
-- Run once in the Supabase SQL editor, BEFORE deploying the app code that
-- reads it (src/lib/accountSettings.js, fetchUserSettings / saveUserSettings
-- in src/lib/api.js). Safe to run twice.
--
-- One row per account. settings is a small JSON object, for example
--   { "sessionSize": 20, "answerMode": "typing", "reduceMotion": false,
--     "autoPlay": true, "slowSpeech": false, "lang": "ja" }
-- The app checks every value when it reads them (cleanSettings()), so an
-- unknown or broken value just falls back to the device's own value.
--
-- The theme is NOT here: it is already saved on the account in
-- user_gacha.theme, and gacha_set_theme() refuses a theme the student
-- hasn't unlocked yet (theme_locked).
--
-- Each student may read, create and change only their own row (RLS).
-- There is no delete: the row goes away with the account (on delete cascade).
-- =====================================================================

create table if not exists public.user_settings (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  settings   jsonb not null default '{}'::jsonb
               check (jsonb_typeof(settings) = 'object' and pg_column_size(settings) <= 2000),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "Read own settings" on public.user_settings;
create policy "Read own settings" on public.user_settings
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Create own settings" on public.user_settings;
create policy "Create own settings" on public.user_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Change own settings" on public.user_settings;
create policy "Change own settings" on public.user_settings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.user_settings from anon, authenticated;
grant select, insert, update on public.user_settings to authenticated;


-- =====================================================================
-- Optional check (read-only, run on its own after the part above).
-- Pretends to be a test student, tries to read and write another
-- account's row, then undoes everything. Every row should say PASS.
-- Change 'aiden' to any test username.
-- =====================================================================
-- begin;
-- select set_config('request.jwt.claims',
--   json_build_object('sub', (select id from auth.users where email = 'aiden@polycards.test'),
--                     'role', 'authenticated')::text, true);
-- set local role authenticated;
-- insert into public.user_settings (settings) values ('{"lang":"en"}') on conflict (user_id) do nothing;
-- select case when count(*) = 1 then 'PASS' else 'FAIL' end as "own row readable"
--   from public.user_settings;
-- select case when count(*) = 0 then 'PASS' else 'FAIL' end as "no other rows visible"
--   from public.user_settings where user_id <> auth.uid();
-- update public.user_settings set settings = '{"lang":"ja"}' where user_id <> auth.uid();
-- select 'PASS (an update of someone else''s row changes 0 rows)' as "other rows unchanged";
-- rollback;
