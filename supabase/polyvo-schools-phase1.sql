-- =====================================================================
-- Polyvo: schools and teacher sign-up, Phase 1 (2026-11-10)
--
-- Run AFTER every polycards-teacher*.sql / polycards-class-*.sql / polycards-roster-prefill.sql /
-- polycards-no-student-leave.sql file, and BEFORE deploying the app code that calls the new
-- functions. The app on main today keeps working after this file is run (same function names and
-- arguments), so the SQL can go first.
-- Safe to run again: tables use "if not exists", the Ryukoku rows use fixed ids / "on conflict",
-- and every function is "create or replace".
--
-- What it does:
--   * schools, school_domains, school_teachers, platform_admins (RLS on, NO grants: only the
--     functions below read or write them).
--   * Moves the current setup into one school: 龍谷中学校・高等学校 (佐賀県), approved, verified
--     domain ryukokurg.ed.jp, domain auto-approve OFF (students use the same domain). Every row of
--     public.teachers becomes an approved teacher there; every class (archived too) belongs to it.
--   * A teacher is now: a row in public.teachers AND an approved membership in an approved school.
--     Removing a teacher from the school takes away every class of that school at once.
--   * Scopes the teacher side to one school: search_users, add_student_to_class, add_co_teacher,
--     remove_co_teacher, add_roster_entries, update_roster_entry, teacher_classes,
--     teacher_roster_pending_counts, create_class, and the helpers user_is_teacher,
--     is_teacher_of_class, is_teacher_of_student (which every other teacher function uses).
--   * Teacher self-registration (Google accounts only), join requests, school admins, and a
--     platform admin who approves new schools.
--
-- Functions REPLACED (rebuilt from the live definitions read with pg_get_functiondef on
-- 2026-11-10, plus only the school rule): user_is_teacher, is_teacher_of_class,
-- is_teacher_of_student, teacher_classes, teacher_roster_pending_counts, create_class,
-- search_users, add_student_to_class, add_co_teacher, remove_co_teacher, add_roster_entries,
-- update_roster_entry. Signatures, return types and grants are unchanged.
--
-- AFTER RUNNING IT: run snippet A (you as platform admin) and snippet B (you as Ryukoku's school
-- admin) below, with your own email. Until B is run, Ryukoku has no school admin (teachers can
-- still teach; nobody can approve join requests).
-- Then run supabase/check-schools.sql (every row PASS).
--
-- ---------------------------------------------------------------------
-- Snippets (copy one out, put a real email in place of the placeholder, run it on its own).
-- Never save a real email in this file: the repository is public.
--
-- A. Make an account a platform admin (sees Polyvo管理, approves new schools):
--    insert into public.platform_admins (user_id)
--    select u.id from auth.users u where lower(u.email) = lower('YOUR-EMAIL@example.com')
--    on conflict do nothing;
--
-- B. Make a teacher of a school its school admin (approves join requests, adds admins):
--    update public.school_teachers st set role = 'admin'
--    from auth.users u
--    where u.id = st.user_id and lower(u.email) = lower('TEACHER-EMAIL@example.com')
--      and st.status = 'approved';
--
-- C. Add a teacher to Ryukoku directly (instead of a join request), with the name students see:
--    with u as (select id from auth.users where lower(email) = lower('TEACHER-EMAIL@example.com'))
--    , t as (insert into public.teachers (user_id, display_name) select id, '〇〇先生' from u
--            on conflict (user_id) do update set display_name = excluded.display_name returning user_id)
--    insert into public.school_teachers (school_id, user_id, role, status, decided_at)
--    select 'f0000000-0000-4000-8000-000000000001', user_id, 'teacher', 'approved', now() from t
--    on conflict do nothing;
--
-- D. Who is in which school, and who is waiting:
--    select s.name, s.status as school_status, st.role, st.status, public.user_display_name(st.user_id), u.email
--    from public.school_teachers st join public.schools s on s.id = st.school_id
--    join auth.users u on u.id = st.user_id
--    order by s.name, st.status, st.role;
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Pure helpers (needed by the tables below)
-- ---------------------------------------------------------------------

-- The 47 prefectures + overseas / other. The app's list (src/lib/schools.js) must match.
create or replace function public.school_prefecture_keys()
returns text[] language sql immutable set search_path = '' as $$
  select array[
    'hokkaido', 'aomori', 'iwate', 'miyagi', 'akita', 'yamagata', 'fukushima',
    'ibaraki', 'tochigi', 'gunma', 'saitama', 'chiba', 'tokyo', 'kanagawa',
    'niigata', 'toyama', 'ishikawa', 'fukui', 'yamanashi', 'nagano',
    'gifu', 'shizuoka', 'aichi', 'mie',
    'shiga', 'kyoto', 'osaka', 'hyogo', 'nara', 'wakayama',
    'tottori', 'shimane', 'okayama', 'hiroshima', 'yamaguchi',
    'tokushima', 'kagawa', 'ehime', 'kochi',
    'fukuoka', 'saga', 'nagasaki', 'kumamoto', 'oita', 'miyazaki', 'kagoshima', 'okinawa',
    'overseas_other']::text[]
$$;

create or replace function public.school_type_keys()
returns text[] language sql immutable set search_path = '' as $$
  select array['jhs', 'hs', 'jhs_hs', 'elementary', 'other']::text[]
$$;

-- What school search compares: NFKC, lower case, katakana → hiragana, no spaces / dots / dashes /
-- long-vowel marks / brackets. 龍谷 中学校 = 龍谷中学校, ﾘｭｳｺｸ = りゅうこく.
create or replace function public.clean_school_search(p_text text)
returns text language sql immutable set search_path = '' as $$
  select translate(
    regexp_replace(lower(normalize(coalesce(p_text, ''), NFKC)), '[\s・.\-ー－‐()（）「」『』]', '', 'g'),
    'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヰヱヲンヴヵヶ',
    'ぁあぃいぅうぇえぉおかがきぎくぐけげこごさざしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわゐゑをんゔゕゖ')
$$;

-- Free-mail / phone / home-internet domains: never a school's verified domain (also their
-- subdomains). THE ONE PLACE this list lives: the app only shows the error.
create or replace function public.is_free_mail_domain(p_domain text)
returns boolean language sql immutable set search_path = '' as $$
  select exists (
    select 1 from unnest(array[
      'gmail.com', 'googlemail.com',
      'yahoo.co.jp', 'yahoo.com', 'yahoo.ne.jp', 'ymail.com', 'rocketmail.com',
      'icloud.com', 'me.com', 'mac.com',
      'outlook.com', 'outlook.jp', 'hotmail.com', 'hotmail.co.jp', 'live.com', 'live.jp', 'msn.com',
      'aol.com', 'aol.jp', 'proton.me', 'protonmail.com', 'gmx.com', 'gmx.net', 'mail.com',
      'yandex.com', 'yandex.ru', 'zoho.com', 'qq.com', '163.com', 'naver.com',
      'docomo.ne.jp', 'ezweb.ne.jp', 'au.com', 'softbank.ne.jp', 'i.softbank.jp', 'disney.ne.jp',
      'ymobile.ne.jp', 'y-mobile.ne.jp', 'emobile.ne.jp', 'pdx.ne.jp', 'willcom.com',
      'uqmobile.jp', 'rakuten.jp', 'rakumail.jp', 'mineo.jp', 'excite.co.jp', 'goo.jp',
      'nifty.com', 'biglobe.ne.jp', 'ocn.ne.jp', 'so-net.ne.jp', 'plala.or.jp', 'dion.ne.jp',
      'odn.ne.jp', 'infoweb.ne.jp', 'jcom.home.ne.jp', 'kcn.ne.jp', 'zaq.ne.jp', 'hi-ho.ne.jp'
    ]::text[]) d
    where lower(p_domain) = d or lower(p_domain) like '%.' || d)
$$;

-- A school domain as typed by the platform admin ("@RyukokuRG.ed.jp", "ryukokurg.ed.jp.") →
-- "ryukokurg.ed.jp". Raises bad_domain / free_mail_domain.
create or replace function public.clean_domain(p_domain text)
returns text language plpgsql immutable set search_path = '' as $$
declare v text := lower(btrim(normalize(coalesce(p_domain, ''), NFKC)));
begin
  v := rtrim(regexp_replace(v, '^.*@', ''), '.');
  if char_length(v) > 253
     or v !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$' then
    raise exception 'bad_domain';
  end if;
  if public.is_free_mail_domain(v) then raise exception 'free_mail_domain'; end if;
  return v;
end;
$$;

-- The part after the LAST @, lower case and trimmed. Domains are compared with = only
-- (never endsWith / contains): student.ryukokurg.ed.jp is NOT ryukokurg.ed.jp.
create or replace function public.email_domain(p_email text)
returns text language sql immutable set search_path = '' as $$
  select nullif(substring(lower(btrim(normalize(coalesce(p_email, ''), NFKC))) from '@([^@]*)$'), '')
$$;

-- The name students see for a teacher (e.g. アンドレ先生): NFKC, spaces collapsed, 1–20.
create or replace function public.clean_teacher_display_name(p_name text)
returns text language plpgsql immutable set search_path = '' as $$
declare v text := btrim(regexp_replace(normalize(coalesce(p_name, ''), NFKC), '\s+', ' ', 'g'));
begin
  if char_length(v) not between 1 and 20 then raise exception 'bad_display_name'; end if;
  return v;
end;
$$;


-- ---------------------------------------------------------------------
-- 2. Tables (RLS on, no grants: only the functions below use them)
-- ---------------------------------------------------------------------

create table if not exists public.schools (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (char_length(btrim(name)) between 2 and 60),
  name_kana           text check (name_kana is null or char_length(name_kana) between 1 and 60),
  name_search         text generated always as (public.clean_school_search(name || ' ' || coalesce(name_kana, ''))) stored,
  prefecture          text not null check (prefecture = any (public.school_prefecture_keys())),
  school_type         text not null check (school_type = any (public.school_type_keys())),
  status              text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  auto_approve_domain boolean not null default false,
  created_by          uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  decided_by          uuid references auth.users (id) on delete set null,
  decided_at          timestamptz
);
create index if not exists schools_status_idx on public.schools (status, prefecture);

-- One school per domain. Free-mail domains are refused by clean_domain() in every function that
-- saves a domain (the SQL editor can still do anything).
create table if not exists public.school_domains (
  domain    text primary key check (domain = lower(btrim(domain)) and position('@' in domain) = 0),
  school_id uuid not null references public.schools (id) on delete cascade,
  added_by  uuid references auth.users (id) on delete set null,
  added_at  timestamptz not null default now()
);
create index if not exists school_domains_school_idx on public.school_domains (school_id);

-- Requests and memberships. History rows stay (declined / removed / cancelled); a person has at
-- most ONE pending-or-approved row (one school per teacher).
create table if not exists public.school_teachers (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         text not null default 'teacher' check (role in ('admin', 'teacher')),
  status       text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'removed', 'cancelled')),
  display_name text check (display_name is null or char_length(display_name) between 1 and 20),
  requested_at timestamptz not null default now(),
  decided_by   uuid references auth.users (id) on delete set null,
  decided_at   timestamptz
);
create unique index if not exists school_teachers_one_active on public.school_teachers (user_id)
  where status in ('pending', 'approved');
create index if not exists school_teachers_school_idx on public.school_teachers (school_id, status);

-- Polyvo staff who approve new schools. SQL editor only (snippet A), like public.teachers.
create table if not exists public.platform_admins (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);

alter table public.schools enable row level security;
alter table public.school_domains enable row level security;
alter table public.school_teachers enable row level security;
alter table public.platform_admins enable row level security;
revoke all on public.schools, public.school_domains, public.school_teachers, public.platform_admins
  from public, anon, authenticated;

-- Every class belongs to one school
alter table public.classes add column if not exists school_id uuid references public.schools (id);
create index if not exists classes_school_idx on public.classes (school_id);


-- ---------------------------------------------------------------------
-- 3. Move today's setup into Ryukoku (fixed id, so running the file again changes nothing)
-- ---------------------------------------------------------------------

insert into public.schools (id, name, name_kana, prefecture, school_type, status, auto_approve_domain, decided_at)
values ('f0000000-0000-4000-8000-000000000001', '龍谷中学校・高等学校', 'りゅうこくちゅうがっこう・こうとうがっこう',
        'saga', 'jhs_hs', 'approved', false, now())
on conflict (id) do nothing;

insert into public.school_domains (domain, school_id)
values ('ryukokurg.ed.jp', 'f0000000-0000-4000-8000-000000000001')
on conflict (domain) do nothing;

-- Every current teacher (Google and polycards.test accounts alike) → approved teacher of Ryukoku
insert into public.school_teachers (school_id, user_id, role, status, display_name, requested_at, decided_at)
select 'f0000000-0000-4000-8000-000000000001', t.user_id, 'teacher', 'approved', t.display_name, t.added_at, now()
from public.teachers t
where not exists (select 1 from public.school_teachers st
                  where st.user_id = t.user_id and st.status in ('pending', 'approved'));

-- Every class (archived too) → Ryukoku
update public.classes set school_id = 'f0000000-0000-4000-8000-000000000001' where school_id is null;
alter table public.classes alter column school_id set not null;


-- ---------------------------------------------------------------------
-- 4. Internal helpers (no grants)
-- ---------------------------------------------------------------------

-- The approved school of an approved membership, or null (pending / declined / removed / none).
create or replace function public.user_school_id(p_user uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select st.school_id from public.school_teachers st
  join public.schools s on s.id = st.school_id and s.status = 'approved'
  where st.user_id = p_user and st.status = 'approved'
  limit 1
$$;

create or replace function public.my_school_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select public.user_school_id(auth.uid())
$$;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (select 1 from public.platform_admins a where a.user_id = auth.uid())
$$;

-- Is this account a student of the school? = a member of any class of it, archived classes too
-- (so last year's students can be added to this year's class).
create or replace function public.student_in_school(p_student uuid, p_school uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.class_members m join public.classes c on c.id = m.class_id
                 where m.student_id = p_student and c.school_id = p_school)
$$;

-- Approval: the profile row in public.teachers (display_name = the name students see).
create or replace function public.grant_teacher_profile(p_user uuid, p_name text)
returns void language sql security definer set search_path = '' as $$
  insert into public.teachers (user_id, display_name) values (p_user, p_name)
  on conflict (user_id) do update set display_name = coalesce(excluded.display_name, public.teachers.display_name)
$$;


-- ---------------------------------------------------------------------
-- 5. Replaced functions: a teacher belongs to one approved school
-- ---------------------------------------------------------------------

-- Teacher = profile row AND approved membership in an approved school.
create or replace function public.user_is_teacher(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.teachers t where t.user_id = p_user)
     and public.user_school_id(p_user) is not null
$$;

-- (is_teacher() itself is unchanged: select public.user_is_teacher(auth.uid()).)

create or replace function public.is_teacher_of_class(p_class_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_teacher() and exists (
    select 1 from public.class_teachers ct
    join public.classes c on c.id = ct.class_id
    where ct.class_id = p_class_id and ct.teacher_id = auth.uid()
      and c.school_id = public.my_school_id())
$$;

create or replace function public.is_teacher_of_student(p_student_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_teacher() and exists (
    select 1 from public.class_members m
    join public.class_teachers ct on ct.class_id = m.class_id
    join public.classes c on c.id = m.class_id
    where m.student_id = p_student_id and ct.teacher_id = auth.uid()
      and c.school_id = public.my_school_id())
$$;

-- An approved admin of this school (and still a teacher)
create or replace function public.is_school_admin(p_school uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_teacher() and public.my_school_id() = p_school and exists (
    select 1 from public.school_teachers st
    where st.school_id = p_school and st.user_id = auth.uid() and st.status = 'approved' and st.role = 'admin')
$$;

create or replace function public.require_school_admin()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v_school uuid;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  v_school := public.my_school_id();
  if v_school is null or not public.is_school_admin(v_school) then raise exception 'not_school_admin'; end if;
  return v_school;
end;
$$;

create or replace function public.require_platform_admin()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if not public.is_platform_admin() then raise exception 'not_platform_admin'; end if;
end;
$$;

create or replace function public.teacher_classes(p_archived boolean default false)
returns table(id uuid, name text, school_year integer, join_code text, archived boolean, student_count integer, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if not public.is_teacher() then raise exception 'not_teacher'; end if;
  return query
    select c.id, c.name, c.school_year, c.join_code, c.archived,
           (select count(*)::int from public.class_members m where m.class_id = c.id), c.created_at
    from public.classes c
    join public.class_teachers ct on ct.class_id = c.id and ct.teacher_id = auth.uid()
    where c.archived = coalesce(p_archived, false)
      and c.school_id = public.my_school_id()
    order by c.school_year desc, c.name;
end;
$$;

create or replace function public.teacher_roster_pending_counts()
returns table(class_id uuid, pending integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if not public.is_teacher() then raise exception 'not_teacher'; end if;
  return query
    select e.class_id, count(*)::int
    from public.class_roster_entries e
    join public.class_teachers ct on ct.class_id = e.class_id and ct.teacher_id = auth.uid()
    join public.classes c on c.id = e.class_id and c.school_id = public.my_school_id()
    where e.claimed_at is null
    group by e.class_id;
end;
$$;

create or replace function public.create_class(p_name text, p_school_year integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_code text; v_school uuid;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if not public.is_teacher() then raise exception 'not_teacher'; end if;
  v_school := public.my_school_id();
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 40 then raise exception 'bad_class_name'; end if;
  if p_school_year is null or p_school_year not between 2000 and 2100 then raise exception 'bad_school_year'; end if;
  v_code := public.new_join_code();
  insert into public.classes (name, school_year, join_code, created_by, school_id)
  values (btrim(p_name), p_school_year, v_code, auth.uid(), v_school) returning id into v_id;
  insert into public.class_teachers (class_id, teacher_id) values (v_id, auth.uid());
  return jsonb_build_object('id', v_id, 'join_code', v_code);
end;
$$;

-- Students: only accounts already in a class of my school (archived classes too).
-- Teachers (p_teachers_only): only approved teachers of my school.
-- The email column stays (same signature) but is always null: emails are never sent back.
create or replace function public.search_users(p_query text, p_teachers_only boolean default false)
returns table(id uuid, display_name text, username text, email text, is_teacher boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_q text := btrim(coalesce(p_query, ''));
  v_like text;
  v_school uuid;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if not public.is_teacher() then raise exception 'not_teacher'; end if;
  if char_length(v_q) < 2 then raise exception 'query_too_short'; end if;
  v_school := public.my_school_id();
  -- % and _ typed by the teacher are searched literally
  v_like := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return query
    select u.id, public.user_display_name(u.id), u.raw_user_meta_data->>'username', null::text,
           public.user_is_teacher(u.id)
    from auth.users u
    where (u.raw_user_meta_data->>'username' ilike v_like
        or u.raw_user_meta_data->>'full_name' ilike v_like
        or u.raw_user_meta_data->>'name' ilike v_like
        or u.email ilike v_like)
      and (case when coalesce(p_teachers_only, false)
                then public.user_is_teacher(u.id) and public.user_school_id(u.id) = v_school
                else public.student_in_school(u.id, v_school) end)
    order by public.user_display_name(u.id)
    limit 20;
end;
$$;

-- Only students already in a class of the same school (archived classes too). Anyone else joins
-- with the class code (their consent) or, in Phase 2, an email invite.
create or replace function public.add_student_to_class(p_class_id uuid, p_student_id uuid, p_real_name text, p_student_number integer default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_class_teacher(p_class_id);
  if (select archived from public.classes where id = p_class_id) then raise exception 'class_archived'; end if;
  if not public.student_in_school(p_student_id, (select c.school_id from public.classes c where c.id = p_class_id)) then
    raise exception 'student_not_in_school';
  end if;
  insert into public.class_members (class_id, student_id, real_name, student_number)
  values (p_class_id, p_student_id, public.clean_real_name(p_real_name), public.check_student_number(p_student_number))
  on conflict (class_id, student_id) do nothing;
  if not found then raise exception 'already_member'; end if;
end;
$$;

-- Only approved teachers of the class's school (anyone else: target_not_teacher, so nothing tells
-- whether that account is a teacher somewhere else).
create or replace function public.add_co_teacher(p_class_id uuid, p_teacher_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_class_teacher(p_class_id);
  if not public.user_is_teacher(p_teacher_user_id)
     or public.user_school_id(p_teacher_user_id) is distinct from (select c.school_id from public.classes c where c.id = p_class_id) then
    raise exception 'target_not_teacher';
  end if;
  insert into public.class_teachers (class_id, teacher_id) values (p_class_id, p_teacher_user_id)
  on conflict do nothing;
  if not found then raise exception 'already_teacher'; end if;
end;
$$;

-- last_teacher: someone else who is still a teacher OF THIS SCHOOL must stay.
create or replace function public.remove_co_teacher(p_class_id uuid, p_teacher_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_school uuid;
begin
  perform public.require_class_teacher(p_class_id);
  -- Lock the class row: two teachers removing each other at the same moment can't both succeed.
  select c.school_id into v_school from public.classes c where c.id = p_class_id for update;
  if not exists (select 1 from public.class_teachers ct
                 where ct.class_id = p_class_id and ct.teacher_id = p_teacher_user_id) then
    raise exception 'teacher_not_in_class';
  end if;
  if not exists (select 1 from public.class_teachers ct
                 where ct.class_id = p_class_id and ct.teacher_id <> p_teacher_user_id
                   and public.user_is_teacher(ct.teacher_id)
                   and public.user_school_id(ct.teacher_id) = v_school) then
    raise exception 'last_teacher';
  end if;
  delete from public.class_teachers ct where ct.class_id = p_class_id and ct.teacher_id = p_teacher_user_id;
end;
$$;

-- 名簿を貼り付け: only at a school with a verified domain (school_not_verified), and only emails
-- on one of its domains (per row: error / outside_school_domain). Otherwise unchanged.
create or replace function public.add_roster_entries(p_class_id uuid, p_rows jsonb, p_dry_run boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
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
  v_school  uuid;
begin
  perform public.require_class_teacher(p_class_id);
  if (select c.archived from public.classes c where c.id = p_class_id) then raise exception 'class_archived'; end if;
  select c.school_id into v_school from public.classes c where c.id = p_class_id;
  if not exists (select 1 from public.school_domains d where d.school_id = v_school) then
    raise exception 'school_not_verified';
  end if;
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
      -- Exact match of the part after the last @ (never "ends with")
      if not exists (select 1 from public.school_domains d
                     where d.school_id = v_school and d.domain = public.email_domain(v_email)) then
        raise exception 'outside_school_domain';
      end if;
    exception when others then
      v_status := 'error';
      v_reason := coalesce((select c from unnest(array['bad_email', 'bad_name', 'bad_number', 'duplicate_email', 'outside_school_domain']) c
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

-- Same domain rule when a pending row's email is changed
create or replace function public.update_roster_entry(p_entry_id uuid, p_real_name text, p_student_number integer, p_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_class uuid; v_email text;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if not public.is_teacher() then raise exception 'not_teacher'; end if;
  select e.class_id into v_class from public.class_roster_entries e where e.id = p_entry_id;
  if v_class is null then raise exception 'roster_entry_not_found'; end if;
  perform public.require_class_teacher(v_class);
  -- A claimed row can't be changed: same answer as before, whatever the new email is
  if not exists (select 1 from public.class_roster_entries e where e.id = p_entry_id and e.claimed_at is null) then
    raise exception 'roster_entry_not_found';
  end if;
  v_email := public.clean_roster_email(p_email);
  if not exists (select 1 from public.school_domains d join public.classes c on c.school_id = d.school_id
                 where c.id = v_class and d.domain = public.email_domain(v_email)) then
    raise exception 'outside_school_domain';
  end if;
  begin
    update public.class_roster_entries
       set real_name = public.clean_real_name(p_real_name),
           student_number = public.check_student_number(p_student_number),
           email = v_email
     where id = p_entry_id and claimed_at is null;
    if not found then raise exception 'roster_entry_not_found'; end if;
  exception when unique_violation then raise exception 'roster_email_taken';
  end;
end;
$$;


-- ---------------------------------------------------------------------
-- 6. New RPCs: everyone
-- ---------------------------------------------------------------------

-- What the account menu needs: { google, is_teacher, is_platform_admin,
--   membership: { status: 'pending'|'approved', role, new_school, school: { id, name, prefecture, school_type } } | null }
create or replace function public.my_school_status()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v record; v_m jsonb := null;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  select st.status as m_status, st.role, s.id, s.name, s.prefecture, s.school_type, s.status as s_status into v
  from public.school_teachers st join public.schools s on s.id = st.school_id
  where st.user_id = auth.uid() and st.status in ('pending', 'approved')
  limit 1;
  if found then
    v_m := jsonb_build_object(
      'status', case when v.m_status = 'approved' and v.s_status = 'approved' then 'approved' else 'pending' end,
      'role', v.role,
      'new_school', v.s_status = 'pending',
      'school', jsonb_build_object('id', v.id, 'name', v.name, 'prefecture', v.prefecture, 'school_type', v.school_type));
  end if;
  return jsonb_build_object(
    'google', public.my_roster_email() is not null,
    'is_teacher', public.is_teacher(),
    'is_platform_admin', public.is_platform_admin(),
    'membership', v_m);
end;
$$;

-- Approved schools by name / kana (partial, NFKC, katakana = hiragana), optionally one prefecture.
-- Only name, prefecture and type: never teachers or counts.
create or replace function public.search_schools(p_query text, p_prefecture text default null)
returns table(id uuid, name text, prefecture text, school_type text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_q    text := public.clean_school_search(p_query);
  v_pref text := nullif(btrim(coalesce(p_prefecture, '')), '');
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if v_q = '' and v_pref is null then raise exception 'query_too_short'; end if;
  return query
    select s.id, s.name, s.prefecture, s.school_type
    from public.schools s
    where s.status = 'approved'
      and (v_pref is null or s.prefecture = v_pref)
      and (v_q = '' or strpos(s.name_search, v_q) > 0)
    order by case when v_q = '' then 0 else strpos(s.name_search, v_q) end, char_length(s.name), s.name
    limit case when v_q = '' then 100 else 20 end;
end;
$$;

-- Ask to join an approved school. Google accounts only (google_only). Approved at once only when
-- the school has auto_approve_domain ON and my Google email's domain is EXACTLY one of its
-- verified domains; otherwise it waits for a school admin. → { status, school_name }
create or replace function public.request_join_school(p_school_id uuid, p_display_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_email  text;
  v_name   text;
  v_school public.schools;
  v_auto   boolean;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  v_email := public.my_roster_email();
  if v_email is null then raise exception 'google_only'; end if;
  if exists (select 1 from public.school_teachers st
             where st.user_id = auth.uid() and st.status in ('pending', 'approved')) then
    raise exception 'already_in_school';
  end if;
  select * into v_school from public.schools s where s.id = p_school_id and s.status = 'approved';
  if v_school.id is null then raise exception 'school_not_found'; end if;
  v_name := public.clean_teacher_display_name(p_display_name);
  v_auto := v_school.auto_approve_domain and exists (
    select 1 from public.school_domains d
    where d.school_id = v_school.id and d.domain = public.email_domain(v_email));
  begin
    insert into public.school_teachers (school_id, user_id, role, status, display_name, decided_at)
    values (v_school.id, auth.uid(), 'teacher', case when v_auto then 'approved' else 'pending' end, v_name,
            case when v_auto then now() end);
  exception when unique_violation then raise exception 'already_in_school';
  end;
  if v_auto then perform public.grant_teacher_profile(auth.uid(), v_name); end if;
  return jsonb_build_object('status', case when v_auto then 'approved' else 'pending' end, 'school_name', v_school.name);
end;
$$;

-- Register a new school: the school and my admin membership, both pending until a platform admin
-- approves them. Google accounts only. → { status: 'pending', school_id }
create or replace function public.register_school(p_name text, p_kana text, p_prefecture text, p_school_type text, p_display_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_name   text := btrim(regexp_replace(normalize(coalesce(p_name, ''), NFKC), '\s+', ' ', 'g'));
  v_kana   text := nullif(btrim(regexp_replace(normalize(coalesce(p_kana, ''), NFKC), '\s+', ' ', 'g')), '');
  v_dname  text;
  v_id     uuid;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if public.my_roster_email() is null then raise exception 'google_only'; end if;
  if exists (select 1 from public.school_teachers st
             where st.user_id = auth.uid() and st.status in ('pending', 'approved')) then
    raise exception 'already_in_school';
  end if;
  if char_length(v_name) not between 2 and 60 then raise exception 'bad_school_name'; end if;
  if v_kana is not null and (char_length(v_kana) > 60 or v_kana !~ '^[ぁ-ゖァ-ヺー・ ]+$') then
    raise exception 'bad_school_kana';
  end if;
  if p_prefecture is null or not (p_prefecture = any (public.school_prefecture_keys())) then raise exception 'bad_prefecture'; end if;
  if p_school_type is null or not (p_school_type = any (public.school_type_keys())) then raise exception 'bad_school_type'; end if;
  v_dname := public.clean_teacher_display_name(p_display_name);
  -- The same name in the same prefecture already exists (approved or waiting): ask to join it instead
  if exists (select 1 from public.schools s
             where s.status in ('pending', 'approved') and s.prefecture = p_prefecture
               and s.name_search = public.clean_school_search(v_name || ' ' || coalesce(v_kana, ''))) then
    raise exception 'school_exists';
  end if;
  if exists (select 1 from public.schools s
             where s.status in ('pending', 'approved') and s.prefecture = p_prefecture
               and public.clean_school_search(s.name) = public.clean_school_search(v_name)) then
    raise exception 'school_exists';
  end if;
  insert into public.schools (name, name_kana, prefecture, school_type, status, created_by)
  values (v_name, v_kana, p_prefecture, p_school_type, 'pending', auth.uid()) returning id into v_id;
  begin
    insert into public.school_teachers (school_id, user_id, role, status, display_name)
    values (v_id, auth.uid(), 'admin', 'pending', v_dname);
  exception when unique_violation then raise exception 'already_in_school';
  end;
  return jsonb_build_object('status', 'pending', 'school_id', v_id);
end;
$$;

-- Cancel my waiting request. A school I registered that is still waiting is deleted with it.
create or replace function public.cancel_school_request()
returns void language plpgsql security definer set search_path = '' as $$
declare v record;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  select st.id, st.school_id, s.status as s_status, s.created_by into v
  from public.school_teachers st join public.schools s on s.id = st.school_id
  where st.user_id = auth.uid() and st.status = 'pending'
  for update of st;
  if not found then raise exception 'no_request'; end if;
  if v.s_status = 'pending' and v.created_by = auth.uid() then
    delete from public.schools s where s.id = v.school_id and s.status = 'pending';
  else
    update public.school_teachers set status = 'cancelled', decided_by = auth.uid(), decided_at = now() where id = v.id;
  end if;
end;
$$;


-- ---------------------------------------------------------------------
-- 7. New RPCs: my school (teachers), school admins
-- ---------------------------------------------------------------------

-- { school: { id, name, name_kana, prefecture, school_type, auto_approve_domain }, domains, is_admin,
--   teachers: [{ user_id, display_name, role, is_me, class_count }],
--   requests (admins only, else []): [{ user_id, display_name, account_name, email, requested_at }] }
create or replace function public.my_school()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_school uuid; v_admin boolean;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if not public.is_teacher() then raise exception 'not_teacher'; end if;
  v_school := public.my_school_id();
  v_admin := public.is_school_admin(v_school);
  return (
    select jsonb_build_object(
      'school', jsonb_build_object('id', s.id, 'name', s.name, 'name_kana', s.name_kana, 'prefecture', s.prefecture,
                                   'school_type', s.school_type, 'auto_approve_domain', s.auto_approve_domain),
      'domains', coalesce((select jsonb_agg(d.domain order by d.domain) from public.school_domains d where d.school_id = s.id), '[]'::jsonb),
      'is_admin', v_admin,
      'teachers', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'user_id', st.user_id, 'display_name', public.teacher_name(st.user_id), 'role', st.role,
                 'is_me', st.user_id = auth.uid(),
                 'class_count', (select count(*)::int from public.class_teachers ct join public.classes c on c.id = ct.class_id
                                 where ct.teacher_id = st.user_id and c.school_id = s.id and not c.archived))
               order by (st.role = 'admin') desc, public.teacher_name(st.user_id))
        from public.school_teachers st
        where st.school_id = s.id and st.status = 'approved'
          and exists (select 1 from public.teachers t where t.user_id = st.user_id)), '[]'::jsonb),
      'requests', case when v_admin then coalesce((
        select jsonb_agg(jsonb_build_object(
                 'user_id', st.user_id, 'display_name', st.display_name,
                 'account_name', public.user_display_name(st.user_id), 'email', u.email,
                 'requested_at', st.requested_at)
               order by st.requested_at)
        from public.school_teachers st join auth.users u on u.id = st.user_id
        where st.school_id = s.id and st.status = 'pending'), '[]'::jsonb) else '[]'::jsonb end)
    from public.schools s where s.id = v_school);
end;
$$;

create or replace function public.decide_school_request(p_user uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_school uuid; v public.school_teachers;
begin
  v_school := public.require_school_admin();
  select * into v from public.school_teachers st
  where st.school_id = v_school and st.user_id = p_user and st.status = 'pending'
  for update;
  if v.id is null then raise exception 'request_not_found'; end if;
  update public.school_teachers
     set status = case when coalesce(p_approve, false) then 'approved' else 'declined' end,
         decided_by = auth.uid(), decided_at = now()
   where id = v.id;
  if coalesce(p_approve, false) then perform public.grant_teacher_profile(p_user, v.display_name); end if;
end;
$$;

-- Make a teacher of my school an admin, or take it away (a school always keeps one admin).
create or replace function public.set_school_admin(p_user uuid, p_admin boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_school uuid;
begin
  v_school := public.require_school_admin();
  perform 1 from public.schools s where s.id = v_school for update;   -- one change at a time
  if not exists (select 1 from public.school_teachers st
                 where st.school_id = v_school and st.user_id = p_user and st.status = 'approved') then
    raise exception 'teacher_not_in_school';
  end if;
  if not coalesce(p_admin, false) and not exists (
       select 1 from public.school_teachers st
       where st.school_id = v_school and st.status = 'approved' and st.role = 'admin' and st.user_id <> p_user) then
    raise exception 'last_admin';
  end if;
  update public.school_teachers set role = case when coalesce(p_admin, false) then 'admin' else 'teacher' end
  where school_id = v_school and user_id = p_user and status = 'approved';
end;
$$;

-- Remove a teacher from my school (admins), or leave it myself (any teacher). They are taken off
-- every class of the school at once; a class that would be left without a teacher gets the admin
-- who removed them (or, when someone leaves, the longest-serving other admin).
create or replace function public.remove_school_teacher(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_school uuid;
  v_target public.school_teachers;
  v_heir   uuid;
  v_class  uuid;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if p_user = auth.uid() then
    if not public.is_teacher() then raise exception 'not_teacher'; end if;
    v_school := public.my_school_id();
  else
    v_school := public.require_school_admin();
  end if;
  perform 1 from public.schools s where s.id = v_school for update;   -- one change at a time
  select * into v_target from public.school_teachers st
  where st.school_id = v_school and st.user_id = p_user and st.status = 'approved';
  if v_target.id is null then raise exception 'teacher_not_in_school'; end if;
  if v_target.role = 'admin' and not exists (
       select 1 from public.school_teachers st
       where st.school_id = v_school and st.status = 'approved' and st.role = 'admin' and st.user_id <> p_user) then
    raise exception 'last_admin';
  end if;

  v_heir := case when p_user <> auth.uid() then auth.uid() else (
    select st.user_id from public.school_teachers st
    where st.school_id = v_school and st.status = 'approved' and st.role = 'admin' and st.user_id <> p_user
      and exists (select 1 from public.teachers t where t.user_id = st.user_id)
    order by st.decided_at nulls first, st.requested_at limit 1) end;

  for v_class in
    select ct.class_id from public.class_teachers ct join public.classes c on c.id = ct.class_id
    where ct.teacher_id = p_user and c.school_id = v_school
  loop
    if not exists (select 1 from public.class_teachers o
                   where o.class_id = v_class and o.teacher_id <> p_user
                     and public.user_is_teacher(o.teacher_id) and public.user_school_id(o.teacher_id) = v_school) then
      if v_heir is null then raise exception 'last_teacher'; end if;
      insert into public.class_teachers (class_id, teacher_id) values (v_class, v_heir) on conflict do nothing;
    end if;
    delete from public.class_teachers where class_id = v_class and teacher_id = p_user;
  end loop;

  update public.school_teachers set status = 'removed', decided_by = auth.uid(), decided_at = now()
  where id = v_target.id;
end;
$$;

-- Domain auto-approve ON/OFF (school admins of that school, or a platform admin). Turn it on only at
-- a school whose students do NOT use the same email domain. Needs a verified domain to turn on.
create or replace function public.set_school_auto_approve(p_school uuid, p_on boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if not (public.is_platform_admin() or public.is_school_admin(p_school)) then raise exception 'not_school_admin'; end if;
  if not exists (select 1 from public.schools s where s.id = p_school) then raise exception 'school_not_found'; end if;
  if coalesce(p_on, false) and not exists (select 1 from public.school_domains d where d.school_id = p_school) then
    raise exception 'school_not_verified';
  end if;
  update public.schools set auto_approve_domain = coalesce(p_on, false) where id = p_school;
end;
$$;


-- ---------------------------------------------------------------------
-- 8. New RPCs: platform admin (Polyvo管理)
-- ---------------------------------------------------------------------

-- Internal: replace a school's verified domains (each through clean_domain: bad_domain /
-- free_mail_domain; a domain of another school: domain_taken). No domains → auto-approve off.
create or replace function public.replace_school_domains(p_school uuid, p_domains text[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_clean text[];
begin
  select coalesce(array_agg(distinct public.clean_domain(d)), '{}') into v_clean
  from unnest(coalesce(p_domains, '{}'::text[])) d where btrim(coalesce(d, '')) <> '';
  if exists (select 1 from public.school_domains sd where sd.domain = any (v_clean) and sd.school_id <> p_school) then
    raise exception 'domain_taken';
  end if;
  delete from public.school_domains sd where sd.school_id = p_school and not (sd.domain = any (v_clean));
  insert into public.school_domains (domain, school_id, added_by)
  select d, p_school, auth.uid() from unnest(v_clean) d
  on conflict (domain) do nothing;
  if cardinality(v_clean) = 0 then
    update public.schools set auto_approve_domain = false where id = p_school;
  end if;
end;
$$;

-- Every school, waiting ones first: [{ id, name, name_kana, prefecture, school_type, status,
--   auto_approve_domain, created_at, domains, teacher_count, admin_count, class_count,
--   pending_requests, creator: { account_name, email, display_name } }]
create or replace function public.admin_schools()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_platform_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', s.id, 'name', s.name, 'name_kana', s.name_kana, 'prefecture', s.prefecture,
             'school_type', s.school_type, 'status', s.status, 'auto_approve_domain', s.auto_approve_domain,
             'created_at', s.created_at,
             'domains', coalesce((select jsonb_agg(d.domain order by d.domain) from public.school_domains d where d.school_id = s.id), '[]'::jsonb),
             'teacher_count', (select count(*)::int from public.school_teachers st where st.school_id = s.id and st.status = 'approved'),
             'admin_count', (select count(*)::int from public.school_teachers st where st.school_id = s.id and st.status = 'approved' and st.role = 'admin'),
             'class_count', (select count(*)::int from public.classes c where c.school_id = s.id and not c.archived),
             'pending_requests', (select count(*)::int from public.school_teachers st where st.school_id = s.id and st.status = 'pending'),
             'creator', case when s.created_by is null then null else jsonb_build_object(
                          'account_name', public.user_display_name(s.created_by),
                          'email', (select u.email from auth.users u where u.id = s.created_by),
                          'display_name', (select st.display_name from public.school_teachers st
                                           where st.school_id = s.id and st.user_id = s.created_by
                                           order by st.requested_at desc limit 1)) end)
           order by (s.status = 'pending') desc, s.name)
    from public.schools s), '[]'::jsonb);
end;
$$;

-- Approve (with its verified domains, may be empty) or decline a waiting school. Approving also
-- approves the person who registered it, as the school's first admin.
create or replace function public.admin_decide_school(p_school uuid, p_approve boolean, p_domains text[] default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_school public.schools; v_member public.school_teachers;
begin
  perform public.require_platform_admin();
  select * into v_school from public.schools s where s.id = p_school for update;
  if v_school.id is null then raise exception 'school_not_found'; end if;
  if v_school.status <> 'pending' then raise exception 'school_not_pending'; end if;

  if coalesce(p_approve, false) then
    perform public.replace_school_domains(p_school, p_domains);
    update public.schools set status = 'approved', decided_by = auth.uid(), decided_at = now() where id = p_school;
    for v_member in
      select * from public.school_teachers st where st.school_id = p_school and st.status = 'pending'
    loop
      update public.school_teachers set status = 'approved', decided_by = auth.uid(), decided_at = now()
      where id = v_member.id;
      perform public.grant_teacher_profile(v_member.user_id, v_member.display_name);
    end loop;
  else
    update public.schools set status = 'declined', decided_by = auth.uid(), decided_at = now() where id = p_school;
    update public.school_teachers set status = 'declined', decided_by = auth.uid(), decided_at = now()
    where school_id = p_school and status = 'pending';
  end if;
end;
$$;

create or replace function public.admin_set_school_domains(p_school uuid, p_domains text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_platform_admin();
  if not exists (select 1 from public.schools s where s.id = p_school) then raise exception 'school_not_found'; end if;
  perform public.replace_school_domains(p_school, p_domains);
end;
$$;


-- ---------------------------------------------------------------------
-- 9. Grants
-- ---------------------------------------------------------------------

-- Internal: nobody calls these directly
revoke execute on function
  public.school_prefecture_keys(), public.school_type_keys(), public.clean_school_search(text),
  public.is_free_mail_domain(text), public.clean_domain(text), public.email_domain(text),
  public.clean_teacher_display_name(text),
  public.user_school_id(uuid), public.my_school_id(), public.is_platform_admin(),
  public.student_in_school(uuid, uuid), public.grant_teacher_profile(uuid, text),
  public.is_school_admin(uuid), public.require_school_admin(), public.require_platform_admin(),
  public.replace_school_domains(uuid, text[])
from public, anon, authenticated;

-- RPCs: signed-in users only (each checks the caller itself)
revoke execute on function
  public.my_school_status(), public.search_schools(text, text), public.request_join_school(uuid, text),
  public.register_school(text, text, text, text, text), public.cancel_school_request(),
  public.my_school(), public.decide_school_request(uuid, boolean), public.set_school_admin(uuid, boolean),
  public.remove_school_teacher(uuid), public.set_school_auto_approve(uuid, boolean),
  public.admin_schools(), public.admin_decide_school(uuid, boolean, text[]),
  public.admin_set_school_domains(uuid, text[])
from public, anon;
grant execute on function
  public.my_school_status(), public.search_schools(text, text), public.request_join_school(uuid, text),
  public.register_school(text, text, text, text, text), public.cancel_school_request(),
  public.my_school(), public.decide_school_request(uuid, boolean), public.set_school_admin(uuid, boolean),
  public.remove_school_teacher(uuid), public.set_school_auto_approve(uuid, boolean),
  public.admin_schools(), public.admin_decide_school(uuid, boolean, text[]),
  public.admin_set_school_domains(uuid, text[])
to authenticated;

-- Quick look after running (read-only):
-- select s.name, s.status, s.auto_approve_domain,
--        (select array_agg(domain) from public.school_domains d where d.school_id = s.id) as domains,
--        (select count(*) from public.school_teachers st where st.school_id = s.id and st.status = 'approved') as teachers,
--        (select count(*) from public.classes c where c.school_id = s.id) as classes
-- from public.schools s;
