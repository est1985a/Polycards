-- =====================================================================
-- Polycards: pre-filled class rosters (名簿を貼り付け) (2026-10-31)
-- Run AFTER polycards-class-leave-and-join-limit.sql and BEFORE deploying the app code that calls
-- these functions. Safe to run twice. No existing function is changed.
--
--   * class_roster_entries: rows a teacher pasted (出席番号, 名前, email). RLS on, no grants:
--     only the functions below read or write it.
--   * add_roster_entries(): a teacher of the class adds / updates rows (p_dry_run = preview only).
--     If the email already belongs to a Google sign-in account, the student is added to the class
--     at once (real name + number, no nickname).
--   * claim_my_roster(): called by the app once per sign-in. Uses ONLY the email of the caller's
--     own Google identity (never one sent by the app) and puts them in their pre-filled classes.
--     Never re-adds a student to a class they left (class_leaves).
--   * class_roster_pending(), teacher_roster_pending_counts(), update_roster_entry(),
--     remove_roster_entry(): the teacher's 未ログイン rows.
-- =====================================================================

-- 1. The table. "Unclaimed" = claimed_at is null.
create table if not exists public.class_roster_entries (
  id             uuid primary key default gen_random_uuid(),
  class_id       uuid not null references public.classes(id) on delete cascade,
  email          text not null check (email = lower(btrim(email)) and char_length(email) <= 254
                                      and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  real_name      text not null check (char_length(btrim(real_name)) between 1 and 40),
  student_number int check (student_number between 1 and 99),        -- 出席番号, optional
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  claimed_by     uuid references auth.users(id) on delete set null,
  claimed_at     timestamptz,
  unique (class_id, email)
);
create index if not exists class_roster_entries_open_email_idx
  on public.class_roster_entries (email) where claimed_at is null;
alter table public.class_roster_entries enable row level security;
revoke all on public.class_roster_entries from anon, authenticated;


-- 2. Internal helpers (not callable from the app)

-- An email as stored: NFKC (full-width → half-width), trimmed, lower case. Same as cleanEmail()
-- in src/lib/rosterPaste.js.
create or replace function public.clean_roster_email(p_email text)
returns text language plpgsql immutable set search_path = ''
as $$
declare v text := lower(btrim(normalize(coalesce(p_email, ''), NFKC)));
begin
  if char_length(v) > 254 or v !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'bad_email'; end if;
  return v;
end;
$$;

-- The account that signs in with Google using this email (verified by Google), or null.
-- A password account with the same address never counts.
create or replace function public.roster_account_for(p_email text)
returns uuid language sql stable security definer set search_path = ''
as $$
  select u.id from auth.users u
  where lower(u.email) = p_email and u.email_confirmed_at is not null
    and exists (select 1 from auth.identities i
                where i.user_id = u.id and i.provider = 'google'
                  and lower(i.identity_data->>'email') = p_email)
  order by u.created_at
  limit 1
$$;

-- The caller's own Google email (null if they don't sign in with Google).
create or replace function public.my_roster_email()
returns text language sql stable security definer set search_path = ''
as $$
  select lower(u.email) from auth.users u
  where u.id = auth.uid() and u.email_confirmed_at is not null
    and exists (select 1 from auth.identities i
                where i.user_id = u.id and i.provider = 'google'
                  and lower(i.identity_data->>'email') = lower(u.email))
$$;

revoke execute on function public.clean_roster_email(text), public.roster_account_for(text),
  public.my_roster_email() from public, anon, authenticated;


-- 3. Teacher: add pasted rows. p_rows = [{ "student_number": "5" | 5 | "", "real_name": "...",
--    "email": "..." }, ...], max 200. Each row gets a result, in order:
--      { row (1-based), email, status, reason }
--    status: added_pending (no account yet) | added_member (Google account exists → in the class now)
--            | already_member (nothing changed) | updated (an unclaimed row: name / number replaced)
--            | error (reason: bad_email, bad_name, bad_number, duplicate_email, already_claimed, bad_rows)
--    An error row is skipped; the other rows are still saved. p_dry_run: the same answers, nothing written.
--    Whole-call errors (raised): not_signed_in, not_teacher, not_class_teacher, class_archived,
--    bad_rows, no_rows, too_many_rows.
create or replace function public.add_roster_entries(p_class_id uuid, p_rows jsonb, p_dry_run boolean default false)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_row     jsonb;
  v_i       int := 0;
  v_out     jsonb := '[]'::jsonb;
  v_dupes   text[];
  v_email   text;
  v_name    text;
  v_raw     text;
  v_num     int;
  v_entry   public.class_roster_entries;
  v_account uuid;
  v_status  text;
  v_reason  text;
begin
  perform public.require_class_teacher(p_class_id);
  if (select c.archived from public.classes c where c.id = p_class_id) then raise exception 'class_archived'; end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then raise exception 'bad_rows'; end if;
  if jsonb_array_length(p_rows) = 0 then raise exception 'no_rows'; end if;
  if jsonb_array_length(p_rows) > 200 then raise exception 'too_many_rows'; end if;
  -- One paste at a time per class (two teachers pasting at once can't race).
  perform 1 from public.classes c where c.id = p_class_id for update;

  -- Emails that appear more than once in this paste: every copy is an error.
  select coalesce(array_agg(d.e), '{}') into v_dupes
  from (select lower(btrim(normalize(coalesce(r->>'email', ''), NFKC))) as e
        from jsonb_array_elements(p_rows) r
        where jsonb_typeof(r) = 'object'
        group by 1 having count(*) > 1) d;

  for v_row in select r from jsonb_array_elements(p_rows) r loop
    v_i := v_i + 1; v_status := null; v_reason := null; v_email := null;

    -- Check the row (any problem → error, the row is skipped)
    begin
      if jsonb_typeof(v_row) <> 'object' then raise exception 'bad_rows'; end if;
      v_email := public.clean_roster_email(v_row->>'email');
      v_name  := public.clean_real_name(v_row->>'real_name');
      v_raw   := nullif(btrim(normalize(coalesce(v_row->>'student_number', ''), NFKC)), '');
      if v_raw is not null and v_raw !~ '^[0-9]{1,2}$' then raise exception 'bad_number'; end if;
      v_num   := public.check_student_number(v_raw::int);
      if v_email = any(v_dupes) then raise exception 'duplicate_email'; end if;
    exception when others then
      v_status := 'error';
      v_reason := coalesce((select c from unnest(array['bad_email', 'bad_name', 'bad_number', 'duplicate_email']) c
                            where position(c in sqlerrm) > 0 limit 1), 'bad_rows');
    end;

    if v_status is null then
      select * into v_entry from public.class_roster_entries e where e.class_id = p_class_id and e.email = v_email;
      v_account := public.roster_account_for(v_email);

      if v_account is not null and exists (select 1 from public.class_members m
                                           where m.class_id = p_class_id and m.student_id = v_account) then
        v_status := 'already_member';   -- nothing about the member changes
        if not p_dry_run and v_entry.id is not null and v_entry.claimed_at is null then
          update public.class_roster_entries set claimed_by = v_account, claimed_at = now() where id = v_entry.id;
        end if;

      elsif v_account is not null then
        v_status := 'added_member';     -- also a student who left earlier: the teacher chose to add them
        if not p_dry_run then
          insert into public.class_members (class_id, student_id, real_name, student_number)
          values (p_class_id, v_account, v_name, v_num);
          insert into public.class_roster_entries (class_id, email, real_name, student_number, created_by, claimed_by, claimed_at)
          values (p_class_id, v_email, v_name, v_num, auth.uid(), v_account, now())
          on conflict (class_id, email) do update
            set real_name = excluded.real_name, student_number = excluded.student_number,
                claimed_by = excluded.claimed_by, claimed_at = excluded.claimed_at;
        end if;

      elsif v_entry.id is not null and v_entry.claimed_at is not null then
        v_status := 'error'; v_reason := 'already_claimed';   -- claimed, but that account is gone

      elsif v_entry.id is not null then
        v_status := 'updated';
        if not p_dry_run then
          update public.class_roster_entries set real_name = v_name, student_number = v_num where id = v_entry.id;
        end if;

      else
        v_status := 'added_pending';
        if not p_dry_run then
          insert into public.class_roster_entries (class_id, email, real_name, student_number, created_by)
          values (p_class_id, v_email, v_name, v_num, auth.uid());
        end if;
      end if;
    end if;

    v_out := v_out || jsonb_build_object('row', v_i, 'email', v_email, 'status', v_status, 'reason', v_reason);
  end loop;
  return v_out;
end;
$$;


-- 4. Student: join my pre-filled classes. No parameters: the email is the caller's own Google
--    email, read here. Returns [{ id, name, needs_nickname }]: classes joined now, plus roster
--    classes joined earlier that still have no nickname (so a closed app asks again).
create or replace function public.claim_my_roster()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_email text;
  v_e     record;
  v_n     int;
  v_out   jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  v_email := public.my_roster_email();
  if v_email is null then return v_out; end if;

  for v_e in
    select e.id, e.class_id, e.real_name, e.student_number, c.name
    from public.class_roster_entries e join public.classes c on c.id = e.class_id
    where e.email = v_email and e.claimed_at is null and not c.archived
    order by e.created_at
    for update of e
  loop
    -- Left this class before: never put back automatically. Marked claimed, so the teacher sees
    -- them under ぬけた生徒 instead of 未ログイン.
    if exists (select 1 from public.class_leaves l where l.class_id = v_e.class_id and l.student_id = auth.uid()) then
      update public.class_roster_entries set claimed_by = auth.uid(), claimed_at = now() where id = v_e.id;
      continue;
    end if;
    insert into public.class_members (class_id, student_id, real_name, student_number)
    values (v_e.class_id, auth.uid(), v_e.real_name, v_e.student_number)
    on conflict (class_id, student_id) do nothing;
    get diagnostics v_n = row_count;
    update public.class_roster_entries set claimed_by = auth.uid(), claimed_at = now() where id = v_e.id;
    if v_n > 0 then
      v_out := v_out || jsonb_build_object('id', v_e.class_id, 'name', v_e.name, 'needs_nickname', true);
    end if;
  end loop;

  -- Roster classes (claimed now or earlier, or added by a teacher's paste) still without a nickname.
  v_out := v_out || coalesce((
    select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'needs_nickname', true) order by m.joined_at)
    from public.class_members m join public.classes c on c.id = m.class_id
    where m.student_id = auth.uid() and m.nickname is null and not c.archived
      and exists (select 1 from public.class_roster_entries e where e.class_id = m.class_id and e.claimed_by = auth.uid())
      and not v_out @> jsonb_build_array(jsonb_build_object('id', c.id))), '[]'::jsonb);
  return v_out;
end;
$$;


-- 5. Teacher of the class (archived included): rows nobody has claimed yet (未ログイン).
create or replace function public.class_roster_pending(p_class_id uuid)
returns table (id uuid, email text, real_name text, student_number int, created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.require_class_teacher(p_class_id);
  return query
    select e.id, e.email, e.real_name, e.student_number, e.created_at
    from public.class_roster_entries e
    where e.class_id = p_class_id and e.claimed_at is null
    order by e.student_number nulls last, e.real_name;
end;
$$;

-- Teacher: 未ログイン counts for every class I teach (the class list's "+ 未ログイン N").
create or replace function public.teacher_roster_pending_counts()
returns table (class_id uuid, pending int)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if not public.is_teacher() then raise exception 'not_teacher'; end if;
  return query
    select e.class_id, count(*)::int
    from public.class_roster_entries e
    join public.class_teachers ct on ct.class_id = e.class_id and ct.teacher_id = auth.uid()
    where e.claimed_at is null
    group by e.class_id;
end;
$$;


-- 6. Teacher: change or remove an unclaimed row (archived classes included, like update_class_member).
--    Errors: roster_entry_not_found (no such row, or already claimed), roster_email_taken.
create or replace function public.update_roster_entry(p_entry_id uuid, p_real_name text, p_student_number int, p_email text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_class uuid;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if not public.is_teacher() then raise exception 'not_teacher'; end if;
  select e.class_id into v_class from public.class_roster_entries e where e.id = p_entry_id;
  if v_class is null then raise exception 'roster_entry_not_found'; end if;
  perform public.require_class_teacher(v_class);
  begin
    update public.class_roster_entries
       set real_name = public.clean_real_name(p_real_name),
           student_number = public.check_student_number(p_student_number),
           email = public.clean_roster_email(p_email)
     where id = p_entry_id and claimed_at is null;
    if not found then raise exception 'roster_entry_not_found'; end if;
  exception when unique_violation then raise exception 'roster_email_taken';
  end;
end;
$$;

create or replace function public.remove_roster_entry(p_entry_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_class uuid;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if not public.is_teacher() then raise exception 'not_teacher'; end if;
  select e.class_id into v_class from public.class_roster_entries e where e.id = p_entry_id;
  if v_class is null then raise exception 'roster_entry_not_found'; end if;
  perform public.require_class_teacher(v_class);
  delete from public.class_roster_entries where id = p_entry_id and claimed_at is null;
  if not found then raise exception 'roster_entry_not_found'; end if;
end;
$$;


-- 7. Who may call what
revoke execute on function
  public.add_roster_entries(uuid, jsonb, boolean), public.claim_my_roster(),
  public.class_roster_pending(uuid), public.teacher_roster_pending_counts(),
  public.update_roster_entry(uuid, text, int, text), public.remove_roster_entry(uuid)
from public, anon;
grant execute on function
  public.add_roster_entries(uuid, jsonb, boolean), public.claim_my_roster(),
  public.class_roster_pending(uuid), public.teacher_roster_pending_counts(),
  public.update_roster_entry(uuid, text, int, text), public.remove_roster_entry(uuid)
to authenticated;

-- =====================================================================
-- Snippets (SQL editor)
-- =====================================================================
-- Unclaimed rows per class:
-- select c.name, e.student_number, e.real_name, e.email, e.created_at
-- from public.class_roster_entries e join public.classes c on c.id = e.class_id
-- where e.claimed_at is null order by c.name, e.student_number nulls last;
--
-- Who claimed what:
-- select c.name, e.real_name, e.email, e.claimed_at
-- from public.class_roster_entries e join public.classes c on c.id = e.class_id
-- where e.claimed_at is not null order by e.claimed_at desc;
