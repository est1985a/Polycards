-- =====================================================================
-- Polycards: leaving a class + a limit on wrong join codes (2026-10-31)
-- Run AFTER polycards-teacher-followups.sql and AFTER the app code that handles both kinds of
-- join-code errors is live on main (the preview and the live app share this database). Safe to run twice.
--
--   1. join_code_setting(): the limits, in ONE place. Change a number and re-run only that function.
--   2. join_code_failures: wrong codes per student (functions only, no grants).
--      After max_failures wrong codes within window_minutes, every code (even a right one) is
--      refused for block_minutes. The wrong code that reaches the limit already says too_many_tries.
--      A successful join clears the count.
--   3. check_join_code / join_class: rebuilt from polycards-class-tab.sql (checked against the live
--      definitions with pg_get_functiondef) plus only the lines marked "Join limit". A wrong code
--      (and the lock-out) is now RETURNED as { "error": "bad_code" } / { "error": "too_many_tries",
--      "retry_at": ... } instead of raised: a raised error would undo the failure count.
--      Every other error is still raised as before.
--   4. leave_class(): a student leaves one of their own classes. Only their class_members row is
--      deleted (study data, My Deck, tickets, Polyavatars, award history are untouched). There is
--      still NO delete grant on class_members: a direct delete from the browser changes nothing.
--   5. class_leaves + class_leavers(): a small record (class, student, name, number, nickname,
--      left_at) so the class's teachers see 「〇〇日にぬけました」 on the roster.
-- =====================================================================

-- 1. The limits (the only place to change them).
create or replace function public.join_code_setting(p_key text)
returns int language sql immutable set search_path = ''
as $$
  select case p_key
    when 'max_failures'   then 5    -- wrong codes allowed ...
    when 'window_minutes' then 15   -- ... within this many minutes
    when 'block_minutes'  then 15   -- then every code is refused for this long
  end
$$;


-- 2. Wrong codes per student. RLS on, no grants: only the functions below read or write it.
create table if not exists public.join_code_failures (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  failures         int not null default 0,
  first_failure_at timestamptz,          -- start of the current window
  blocked_until    timestamptz           -- null = not blocked
);
alter table public.join_code_failures enable row level security;
revoke all on public.join_code_failures from anon, authenticated;

-- When the caller may try again (null = not blocked now). Internal.
create or replace function public.join_code_blocked_until()
returns timestamptz language sql stable security definer set search_path = ''
as $$
  select f.blocked_until from public.join_code_failures f
  where f.user_id = auth.uid() and f.blocked_until > now()
$$;

-- Counts one wrong code for the caller. Returns the time the block ends when this try reached the
-- limit, else null. The row is locked, so two quick taps can't both slip under the limit. Internal.
create or replace function public.note_join_code_failure()
returns timestamptz language plpgsql security definer set search_path = ''
as $$
declare
  v public.join_code_failures;
  v_window interval := make_interval(mins => public.join_code_setting('window_minutes'));
begin
  insert into public.join_code_failures (user_id) values (auth.uid()) on conflict do nothing;
  select * into v from public.join_code_failures f where f.user_id = auth.uid() for update;
  if v.first_failure_at is null or v.first_failure_at < now() - v_window then
    v.failures := 1; v.first_failure_at := now();      -- a new window
  else
    v.failures := v.failures + 1;
  end if;
  if v.failures >= public.join_code_setting('max_failures') then
    update public.join_code_failures
       set failures = 0, first_failure_at = null,
           blocked_until = now() + make_interval(mins => public.join_code_setting('block_minutes'))
     where user_id = auth.uid()
    returning blocked_until into v.blocked_until;
    return v.blocked_until;
  end if;
  update public.join_code_failures
     set failures = v.failures, first_failure_at = v.first_failure_at, blocked_until = null
   where user_id = auth.uid();
  return null;
end;
$$;

-- What a wrong code returns: bad_code, or too_many_tries when it reached the limit. Internal.
create or replace function public.join_code_wrong()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_until timestamptz := public.note_join_code_failure();
begin
  if v_until is not null then
    return jsonb_build_object('error', 'too_many_tries', 'retry_at', v_until);
  end if;
  return jsonb_build_object('error', 'bad_code');
end;
$$;

revoke execute on function public.join_code_setting(text), public.join_code_blocked_until(),
  public.note_join_code_failure(), public.join_code_wrong() from public, anon, authenticated;


-- 3a. check_join_code: same as polycards-class-tab.sql, plus the "Join limit" lines.
--     No longer "stable": it writes the failure count.
create or replace function public.check_join_code(p_code text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_code text := public.clean_join_code(p_code);
  v_class public.classes;
  v_until timestamptz;   -- Join limit
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  v_until := public.join_code_blocked_until();   -- Join limit: blocked → even a right code waits
  if v_until is not null then return jsonb_build_object('error', 'too_many_tries', 'retry_at', v_until); end if;
  select * into v_class from public.classes c where c.join_code = v_code;
  if not found then return public.join_code_wrong(); end if;   -- Join limit: returned, not raised
  if v_class.archived then raise exception 'class_archived'; end if;
  if exists (select 1 from public.class_members m where m.class_id = v_class.id and m.student_id = auth.uid()) then
    raise exception 'already_member';
  end if;
  return jsonb_build_object('id', v_class.id, 'name', v_class.name);
end;
$$;

-- 3b. join_class: same as polycards-class-tab.sql, plus the "Join limit" lines.
create or replace function public.join_class(p_code text, p_real_name text, p_student_number int default null,
                                             p_nickname text default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_code text := public.clean_join_code(p_code);
  v_class public.classes;
  v_nick text := case when nullif(btrim(coalesce(p_nickname, '')), '') is null then null
                      else public.clean_nickname(p_nickname) end;
  v_n int;
  v_until timestamptz;   -- Join limit
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  v_until := public.join_code_blocked_until();   -- Join limit
  if v_until is not null then return jsonb_build_object('error', 'too_many_tries', 'retry_at', v_until); end if;
  select * into v_class from public.classes c where c.join_code = v_code;
  if not found then return public.join_code_wrong(); end if;   -- Join limit: returned, not raised
  if v_class.archived then raise exception 'class_archived'; end if;
  begin
    insert into public.class_members (class_id, student_id, real_name, student_number, nickname)
    values (v_class.id, auth.uid(), public.clean_real_name(p_real_name), public.check_student_number(p_student_number), v_nick)
    on conflict (class_id, student_id) do nothing;
    get diagnostics v_n = row_count;
  exception when unique_violation then raise exception 'nickname_taken';
  end;
  if v_n = 0 then raise exception 'already_member'; end if;
  delete from public.join_code_failures where user_id = auth.uid();   -- Join limit: a join clears the count
  return jsonb_build_object('id', v_class.id, 'name', v_class.name);
end;
$$;


-- 5 (table first). Who left which class. RLS on, no grants: read only through class_leavers().
create table if not exists public.class_leaves (
  id             uuid primary key default gen_random_uuid(),
  class_id       uuid not null references public.classes(id) on delete cascade,
  student_id     uuid not null references auth.users(id) on delete cascade,
  real_name      text not null,
  student_number int,
  nickname       text,
  left_at        timestamptz not null default now()
);
create index if not exists class_leaves_class_idx on public.class_leaves (class_id, left_at desc);
alter table public.class_leaves enable row level security;
revoke all on public.class_leaves from anon, authenticated;


-- 4. A student leaves one of their classes (archived ones too). Only their own row: the
--    student id is always auth.uid(), never a parameter. Errors: not_signed_in, not_member.
create or replace function public.leave_class(p_class_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v public.class_members;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  delete from public.class_members m
   where m.class_id = p_class_id and m.student_id = auth.uid()
  returning * into v;
  if not found then raise exception 'not_member'; end if;
  insert into public.class_leaves (class_id, student_id, real_name, student_number, nickname)
  values (v.class_id, v.student_id, v.real_name, v.student_number, v.nickname);
end;
$$;
revoke execute on function public.leave_class(uuid) from public, anon;
grant execute on function public.leave_class(uuid) to authenticated;


-- 5. Teacher of the class (archived included): students who left and haven't come back,
--    their latest leave only, newest first.
create or replace function public.class_leavers(p_class_id uuid)
returns table (student_id uuid, real_name text, student_number int, nickname text, left_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.require_class_teacher(p_class_id);
  return query
    select x.student_id, x.real_name, x.student_number, x.nickname, x.left_at
    from (select distinct on (l.student_id) l.*
          from public.class_leaves l
          where l.class_id = p_class_id
          order by l.student_id, l.left_at desc) x
    where not exists (select 1 from public.class_members m
                      where m.class_id = p_class_id and m.student_id = x.student_id)
    order by x.left_at desc;
end;
$$;
revoke execute on function public.class_leavers(uuid) from public, anon;
grant execute on function public.class_leavers(uuid) to authenticated;


-- =====================================================================
-- Snippets (SQL editor)
-- =====================================================================
-- Who is counting / blocked right now:
-- select coalesce(u.raw_user_meta_data->>'username', u.email) as who, f.failures, f.first_failure_at, f.blocked_until
-- from public.join_code_failures f join auth.users u on u.id = f.user_id
-- order by f.blocked_until desc nulls last;
--
-- Unblock one student at once (username OR full email):
-- delete from public.join_code_failures
-- where user_id = (select id from auth.users
--                  where lower(raw_user_meta_data->>'username') = 'test1' or lower(email) = 'test1');
--
-- Who left which class:
-- select c.name as class_name, l.student_number, l.real_name, l.nickname, l.left_at
-- from public.class_leaves l join public.classes c on c.id = l.class_id
-- order by l.left_at desc;
