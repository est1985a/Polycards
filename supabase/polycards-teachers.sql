-- =====================================================================
-- Polycards: teachers and classes, Phase 1 (2026-10-30)
-- Run once in the Supabase SQL editor, BEFORE deploying the app code that
-- calls these functions. Safe to run twice.
--
-- Who can do what:
--   * Teachers are listed in public.teachers. Only the SQL editor can change
--     that list; nobody can read or change it from the app.
--   * Teachers make classes, see and manage only the classes they teach
--     (co-teachers share a class). Students join with the class's code.
--   * A student's real name and 出席番号 are seen only by that student and
--     the teachers of that class. Students never see join codes.
--   * Every change goes through the functions below, which check who is
--     calling. The tables themselves are read-only (and only through RLS).
--
-- Make someone a teacher (put a test-account username OR a full email in both places):
--   insert into public.teachers (user_id)
--   select id from auth.users
--   where lower(raw_user_meta_data->>'username') = 'test1' or lower(email) = 'test1'
--   on conflict do nothing;
-- Check who the teachers are:
--   select u.email, u.raw_user_meta_data->>'username' as username, t.added_at
--   from public.teachers t join auth.users u on u.id = t.user_id;
-- Stop someone being a teacher (their classes stay, but they can't open them):
--   delete from public.teachers where user_id = (select id from auth.users where lower(email) = 'someone@gmail.com');
-- =====================================================================

-- 1. Who is a teacher. No policies and no grants: only the SQL editor can read or change it.
create table if not exists public.teachers (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.teachers enable row level security;
revoke all on public.teachers from anon, authenticated;

-- Is this user a teacher? Internal (not callable from the app).
create or replace function public.user_is_teacher(p_user uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.teachers t where t.user_id = p_user) $$;
revoke execute on function public.user_is_teacher(uuid) from public, anon, authenticated;

-- Am I a teacher? Used by policies and by the app (shows the 先生 tab).
create or replace function public.is_teacher()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.user_is_teacher(auth.uid()) $$;


-- 2. Classes
create table if not exists public.classes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  school_year int  not null check (school_year between 2000 and 2100),   -- 年度, e.g. 2026
  join_code   text not null unique check (join_code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{6}$'),
  archived    boolean not null default false,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- 3. Teachers of a class (co-teachers)
create table if not exists public.class_teachers (
  class_id   uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  added_at   timestamptz not null default now(),
  primary key (class_id, teacher_id)
);
create index if not exists class_teachers_teacher_idx on public.class_teachers (teacher_id);

-- 4. Students in a class (a student may be in several classes)
create table if not exists public.class_members (
  class_id       uuid not null references public.classes(id) on delete cascade,
  student_id     uuid not null references auth.users(id) on delete cascade,
  real_name      text not null check (char_length(btrim(real_name)) between 1 and 40),
  student_number int check (student_number between 1 and 99),        -- 出席番号, optional
  joined_at      timestamptz not null default now(),
  primary key (class_id, student_id)
);
create index if not exists class_members_student_idx on public.class_members (student_id);


-- 5. Helpers for policies and later phases (SECURITY DEFINER: no RLS recursion)
create or replace function public.is_teacher_of_class(p_class_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.is_teacher() and exists (
    select 1 from public.class_teachers ct
    where ct.class_id = p_class_id and ct.teacher_id = auth.uid())
$$;

-- True when I teach any class (archived included) this student is in. For Phase 2+.
create or replace function public.is_teacher_of_student(p_student_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.is_teacher() and exists (
    select 1 from public.class_members m
    join public.class_teachers ct on ct.class_id = m.class_id
    where m.student_id = p_student_id and ct.teacher_id = auth.uid())
$$;

-- Name shown for a user: username (test accounts), Google name, else email. Internal.
create or replace function public.user_display_name(p_user uuid)
returns text language sql stable security definer set search_path = ''
as $$
  select coalesce(nullif(u.raw_user_meta_data->>'username', ''), nullif(u.raw_user_meta_data->>'full_name', ''),
                  nullif(u.raw_user_meta_data->>'name', ''), u.email)
  from auth.users u where u.id = p_user
$$;
revoke execute on function public.user_display_name(uuid) from public, anon, authenticated;

-- A new unused join code. Internal.
create or replace function public.new_join_code()
returns text language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_chars constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code  text;
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.classes c where c.join_code = v_code);
  end loop;
  return v_code;
end;
$$;
revoke execute on function public.new_join_code() from public, anon, authenticated;

-- Clean name / number checks shared by the RPCs. Internal.
create or replace function public.clean_real_name(p_name text)
returns text language plpgsql immutable set search_path = ''
as $$
declare v text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
begin
  if char_length(v) not between 1 and 40 then raise exception 'bad_name'; end if;
  return v;
end;
$$;
create or replace function public.check_student_number(p_number int)
returns int language plpgsql immutable set search_path = ''
as $$
begin
  if p_number is not null and p_number not between 1 and 99 then raise exception 'bad_number'; end if;
  return p_number;
end;
$$;
revoke execute on function public.clean_real_name(text), public.check_student_number(int) from public, anon, authenticated;


-- 6. RLS: read only; every write goes through the functions below.
alter table public.classes        enable row level security;
alter table public.class_teachers enable row level security;
alter table public.class_members  enable row level security;
revoke all on public.classes, public.class_teachers, public.class_members from anon, authenticated;
grant select on public.classes, public.class_teachers, public.class_members to authenticated;

drop policy if exists "Teachers read their classes" on public.classes;
create policy "Teachers read their classes" on public.classes
  for select to authenticated using (public.is_teacher_of_class(id));

drop policy if exists "Teachers read their class teachers" on public.class_teachers;
create policy "Teachers read their class teachers" on public.class_teachers
  for select to authenticated using (public.is_teacher_of_class(class_id));

drop policy if exists "Read own membership or my class roster" on public.class_members;
create policy "Read own membership or my class roster" on public.class_members
  for select to authenticated
  using ((select auth.uid()) = student_id or public.is_teacher_of_class(class_id));


-- 7. Teacher functions
-- Each raises: not_signed_in, not_teacher (not a teacher at all) or not_class_teacher (not this class).
create or replace function public.require_class_teacher(p_class_id uuid)
returns void language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if not public.is_teacher() then raise exception 'not_teacher'; end if;
  if not public.is_teacher_of_class(p_class_id) then raise exception 'not_class_teacher'; end if;
end;
$$;
revoke execute on function public.require_class_teacher(uuid) from public, anon, authenticated;

create or replace function public.create_class(p_name text, p_school_year int)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_id uuid; v_code text;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if not public.is_teacher() then raise exception 'not_teacher'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 40 then raise exception 'bad_class_name'; end if;
  if p_school_year is null or p_school_year not between 2000 and 2100 then raise exception 'bad_school_year'; end if;
  v_code := public.new_join_code();
  insert into public.classes (name, school_year, join_code, created_by)
  values (btrim(p_name), p_school_year, v_code, auth.uid()) returning id into v_id;
  insert into public.class_teachers (class_id, teacher_id) values (v_id, auth.uid());
  return jsonb_build_object('id', v_id, 'join_code', v_code);
end;
$$;

create or replace function public.update_class(p_class_id uuid, p_name text, p_school_year int)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_class_teacher(p_class_id);
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 40 then raise exception 'bad_class_name'; end if;
  if p_school_year is null or p_school_year not between 2000 and 2100 then raise exception 'bad_school_year'; end if;
  update public.classes set name = btrim(p_name), school_year = p_school_year where id = p_class_id;
end;
$$;

create or replace function public.set_class_archived(p_class_id uuid, p_archived boolean)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_class_teacher(p_class_id);
  update public.classes set archived = coalesce(p_archived, false) where id = p_class_id;
end;
$$;

create or replace function public.regenerate_join_code(p_class_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_code text;
begin
  perform public.require_class_teacher(p_class_id);
  v_code := public.new_join_code();
  update public.classes set join_code = v_code where id = p_class_id;
  return v_code;
end;
$$;

-- My classes as a teacher, with student counts.
create or replace function public.teacher_classes(p_archived boolean default false)
returns table (id uuid, name text, school_year int, join_code text, archived boolean, student_count int, created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if not public.is_teacher() then raise exception 'not_teacher'; end if;
  return query
    select c.id, c.name, c.school_year, c.join_code, c.archived,
           (select count(*)::int from public.class_members m where m.class_id = c.id), c.created_at
    from public.classes c
    join public.class_teachers ct on ct.class_id = c.id and ct.teacher_id = auth.uid()
    where c.archived = coalesce(p_archived, false)
    order by c.school_year desc, c.name;
end;
$$;

-- One class: its details, roster (sorted by 出席番号, then name) and teachers.
create or replace function public.class_detail(p_class_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.require_class_teacher(p_class_id);
  return (
    select jsonb_build_object(
      'class', jsonb_build_object('id', c.id, 'name', c.name, 'school_year', c.school_year,
                                  'join_code', c.join_code, 'archived', c.archived),
      'students', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'student_id', m.student_id, 'real_name', m.real_name, 'student_number', m.student_number,
                 'display_name', public.user_display_name(m.student_id), 'email', u.email, 'joined_at', m.joined_at)
               order by m.student_number nulls last, m.real_name)
        from public.class_members m join auth.users u on u.id = m.student_id
        where m.class_id = c.id), '[]'::jsonb),
      'teachers', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'teacher_id', ct.teacher_id, 'display_name', public.user_display_name(ct.teacher_id),
                 'is_me', ct.teacher_id = auth.uid())
               order by ct.added_at)
        from public.class_teachers ct where ct.class_id = c.id), '[]'::jsonb))
    from public.classes c where c.id = p_class_id);
end;
$$;

-- Teachers only: find accounts by username, Google name or email (part of it, any case). Max 20.
-- p_teachers_only: only teacher accounts (for adding a co-teacher).
create or replace function public.search_users(p_query text, p_teachers_only boolean default false)
returns table (id uuid, display_name text, username text, email text, is_teacher boolean)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_q text := btrim(coalesce(p_query, ''));
  v_like text;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if not public.is_teacher() then raise exception 'not_teacher'; end if;
  if char_length(v_q) < 2 then raise exception 'query_too_short'; end if;
  -- % and _ typed by the teacher are searched literally
  v_like := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return query
    select u.id, public.user_display_name(u.id), u.raw_user_meta_data->>'username', u.email::text,
           public.user_is_teacher(u.id)
    from auth.users u
    where (u.raw_user_meta_data->>'username' ilike v_like
        or u.raw_user_meta_data->>'full_name' ilike v_like
        or u.raw_user_meta_data->>'name' ilike v_like
        or u.email ilike v_like)
      and (not coalesce(p_teachers_only, false) or public.user_is_teacher(u.id))
    order by public.user_display_name(u.id)
    limit 20;
end;
$$;

create or replace function public.add_student_to_class(p_class_id uuid, p_student_id uuid, p_real_name text, p_student_number int default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_class_teacher(p_class_id);
  if (select archived from public.classes where id = p_class_id) then raise exception 'class_archived'; end if;
  if not exists (select 1 from auth.users u where u.id = p_student_id) then raise exception 'user_not_found'; end if;
  insert into public.class_members (class_id, student_id, real_name, student_number)
  values (p_class_id, p_student_id, public.clean_real_name(p_real_name), public.check_student_number(p_student_number))
  on conflict (class_id, student_id) do nothing;
  if not found then raise exception 'already_member'; end if;
end;
$$;

create or replace function public.update_class_member(p_class_id uuid, p_student_id uuid, p_real_name text, p_student_number int default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_class_teacher(p_class_id);
  update public.class_members
     set real_name = public.clean_real_name(p_real_name), student_number = public.check_student_number(p_student_number)
   where class_id = p_class_id and student_id = p_student_id;
  if not found then raise exception 'not_member'; end if;
end;
$$;

create or replace function public.remove_student_from_class(p_class_id uuid, p_student_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_class_teacher(p_class_id);
  delete from public.class_members where class_id = p_class_id and student_id = p_student_id;
end;
$$;

create or replace function public.add_co_teacher(p_class_id uuid, p_teacher_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_class_teacher(p_class_id);
  if not public.user_is_teacher(p_teacher_user_id) then raise exception 'target_not_teacher'; end if;
  insert into public.class_teachers (class_id, teacher_id) values (p_class_id, p_teacher_user_id)
  on conflict do nothing;
  if not found then raise exception 'already_teacher'; end if;
end;
$$;


-- 8. Student functions
-- Join with a code. Spaces and hyphens are ignored, any case.
create or replace function public.join_class(p_code text, p_real_name text, p_student_number int default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));
  v_class public.classes;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  select * into v_class from public.classes c where c.join_code = v_code;
  if not found then raise exception 'bad_code'; end if;
  if v_class.archived then raise exception 'class_archived'; end if;
  insert into public.class_members (class_id, student_id, real_name, student_number)
  values (v_class.id, auth.uid(), public.clean_real_name(p_real_name), public.check_student_number(p_student_number))
  on conflict (class_id, student_id) do nothing;
  if not found then raise exception 'already_member'; end if;
  return jsonb_build_object('id', v_class.id, 'name', v_class.name);
end;
$$;

-- Check a code before asking for the name (step 1 of joining): the class name, or an error.
create or replace function public.check_join_code(p_code text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));
  v_class public.classes;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  select * into v_class from public.classes c where c.join_code = v_code;
  if not found then raise exception 'bad_code'; end if;
  if v_class.archived then raise exception 'class_archived'; end if;
  if exists (select 1 from public.class_members m where m.class_id = v_class.id and m.student_id = auth.uid()) then
    raise exception 'already_member';
  end if;
  return jsonb_build_object('id', v_class.id, 'name', v_class.name);
end;
$$;

-- The classes I'm in (name only; archived classes left out).
create or replace function public.my_classes()
returns table (id uuid, name text, joined_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.name, m.joined_at
  from public.class_members m join public.classes c on c.id = m.class_id
  where m.student_id = auth.uid() and not c.archived
  order by m.joined_at
$$;


-- 9. Who may call what
revoke execute on function
  public.is_teacher(), public.is_teacher_of_class(uuid), public.is_teacher_of_student(uuid),
  public.create_class(text, int), public.update_class(uuid, text, int), public.set_class_archived(uuid, boolean),
  public.regenerate_join_code(uuid), public.teacher_classes(boolean), public.class_detail(uuid),
  public.search_users(text, boolean), public.add_student_to_class(uuid, uuid, text, int),
  public.update_class_member(uuid, uuid, text, int), public.remove_student_from_class(uuid, uuid),
  public.add_co_teacher(uuid, uuid), public.join_class(text, text, int), public.check_join_code(text),
  public.my_classes()
from public, anon;
grant execute on function
  public.is_teacher(), public.is_teacher_of_class(uuid), public.is_teacher_of_student(uuid),
  public.create_class(text, int), public.update_class(uuid, text, int), public.set_class_archived(uuid, boolean),
  public.regenerate_join_code(uuid), public.teacher_classes(boolean), public.class_detail(uuid),
  public.search_users(text, boolean), public.add_student_to_class(uuid, uuid, text, int),
  public.update_class_member(uuid, uuid, text, int), public.remove_student_from_class(uuid, uuid),
  public.add_co_teacher(uuid, uuid), public.join_class(text, text, int), public.check_join_code(text),
  public.my_classes()
to authenticated;
