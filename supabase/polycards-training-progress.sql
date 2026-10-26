-- =====================================================================
-- Polycards: Training tab progress, saved per student (2026-10-26)
-- Run once in the Supabase SQL editor, BEFORE deploying the app code that
-- reads it (until then the Training ✓ marks only last for one visit).
--
-- One row per student and practice. practice_id is a stable id that never
-- changes when the screens change: for ABCを書こう one per letter and case,
-- 'abc-upper-a' … 'abc-upper-z' and 'abc-lower-a' … 'abc-lower-z'
-- (letterPracticeId() in src/lib/training.js).
--
-- Students may only read their own rows; only record_training_completion()
-- writes them, so the counts can't be changed from the browser.
-- Safe to run twice.
-- =====================================================================

create table if not exists public.user_training_progress (
  user_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  practice_id        text not null check (practice_id ~ '^[a-z0-9-]{1,64}$'),
  first_completed_at timestamptz not null default now(),
  last_completed_at  timestamptz not null default now(),
  times_completed    int not null default 1 check (times_completed >= 1),
  primary key (user_id, practice_id)
);

alter table public.user_training_progress enable row level security;
drop policy if exists "Read own training progress" on public.user_training_progress;
create policy "Read own training progress" on public.user_training_progress
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.user_training_progress from anon, authenticated;
grant select on public.user_training_progress to authenticated;


-- A practice was completed: first time = new row, after that +1 and a new last time.
create or replace function public.record_training_completion(p_practice_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not_signed_in'; end if;
  if p_practice_id is null or p_practice_id !~ '^[a-z0-9-]{1,64}$' then
    raise exception 'bad_practice';
  end if;
  insert into public.user_training_progress (user_id, practice_id)
  values (v_user, p_practice_id)
  on conflict (user_id, practice_id) do update
    set times_completed   = public.user_training_progress.times_completed + 1,
        last_completed_at = now();
end;
$$;

revoke execute on function public.record_training_completion(text) from public, anon, authenticated;
grant execute on function public.record_training_completion(text) to authenticated;
