-- =====================================================================
-- Polycards: クラス tab — nicknames and the weekly class leaderboard (2026-10-30)
-- Run AFTER polycards-teacher-phase3.sql, BEFORE deploying the app code (the app sends p_nickname
-- to join_class and calls the new functions). Safe to run twice.
--
--   * class_members.nickname: what classmates see (1–12 characters after NFKC + trimming, unique in
--     a class ignoring case). Real names stay teacher-only.
--   * classes.leaderboard_enabled (default true): the teacher's switch.
--   * class_leaderboard(): top 10 by first-answer reviews this week (Monday–Sunday, Japan time),
--     my own row, and last week's top 3. Only rank, nickname, the Polyavatar picture (no name, no id),
--     reviews and is_me leave the database. Never user ids, real names or emails.
--   * join_class and check_join_code now clean the code the same way, in one place
--     (clean_join_code: NFKC, so ＡＢＣ２３４ works, then the same characters as normalizeJoinCode()
--     in src/lib/classes.js). join_class and class_detail were rebuilt from the live definitions
--     (pg_get_functiondef, 2026-10-30; identical to polycards-teachers.sql) plus only the changes
--     marked "Class tab".
-- =====================================================================

-- 0. Columns
alter table public.class_members add column if not exists nickname text;
alter table public.class_members drop constraint if exists class_members_nickname_length;
alter table public.class_members add constraint class_members_nickname_length
  check (nickname is null or char_length(nickname) between 1 and 12);
create unique index if not exists class_members_nickname_uq
  on public.class_members (class_id, lower(nickname)) where nickname is not null;

alter table public.classes add column if not exists leaderboard_enabled boolean not null default true;


-- 1. Internal helpers (not callable from the app)

-- A join code as stored: NFKC (full-width → half-width), uppercase, without spaces, hyphens, ー and
-- dashes. Same as normalizeJoinCode() in src/lib/classes.js.
create or replace function public.clean_join_code(p_code text)
returns text language sql immutable set search_path = ''
as $$ select upper(regexp_replace(normalize(coalesce(p_code, ''), NFKC), '[-\sー‐-―]', '', 'g')) $$;

-- A nickname as stored: NFKC (full-width → half-width, U+3000 → space), spaces collapsed, trimmed.
-- Same as cleanNickname() in src/lib/classes.js.
create or replace function public.clean_nickname(p_nickname text)
returns text language plpgsql immutable set search_path = ''
as $$
declare v text := btrim(regexp_replace(normalize(coalesce(p_nickname, ''), NFKC), '\s+', ' ', 'g'));
begin
  if char_length(v) not between 1 and 12 or v ~ '[[:cntrl:]]' then raise exception 'bad_nickname'; end if;
  return v;
end;
$$;

-- Members with a nickname and reviews > 0 in the 7 Japan days from p_from (a Monday), ranked by
-- first-answer reviews. Ties share a rank (1, 2, 2, 4).
create or replace function public.class_week_ranks(p_class_id uuid, p_from date)
returns table (student_id uuid, nickname text, reviews int, rnk int)
language sql stable security definer set search_path = ''
as $$
  select m.student_id, m.nickname, sum(d.reviews)::int,
         (rank() over (order by sum(d.reviews) desc))::int
  from public.class_members m
  join public.user_study_daily d on d.user_id = m.student_id and d.day >= p_from and d.day < p_from + 7
  where m.class_id = p_class_id and m.nickname is not null
  group by m.student_id, m.nickname
  having sum(d.reviews) > 0
$$;

-- Only what's needed to draw a student's worn Polyavatar: no id, no name. Secrets are shown too.
create or replace function public.leaderboard_avatar(p_user uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('slug', a.slug, 'rarity', a.rarity, 'image_url', a.image_url)
  from public.user_gacha g join public.avatars a on a.id = g.equipped_avatar_id
  where g.user_id = p_user
$$;

revoke execute on function public.clean_join_code(text), public.clean_nickname(text),
  public.class_week_ranks(uuid, date), public.leaderboard_avatar(uuid) from public, anon, authenticated;


-- 2. join_class: + p_nickname (optional here so an older app still works; the app always sends one).
--    The 3-argument version is dropped first (two versions would make the app's call ambiguous).
drop function if exists public.join_class(text, text, int);
create or replace function public.join_class(p_code text, p_real_name text, p_student_number int default null,
                                             p_nickname text default null)   -- Class tab
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_code text := public.clean_join_code(p_code);   -- Class tab: shared with check_join_code
  v_class public.classes;
  v_nick text := case when nullif(btrim(coalesce(p_nickname, '')), '') is null then null
                      else public.clean_nickname(p_nickname) end;   -- Class tab
  v_n int;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  select * into v_class from public.classes c where c.join_code = v_code;
  if not found then raise exception 'bad_code'; end if;
  if v_class.archived then raise exception 'class_archived'; end if;
  begin   -- Class tab: a nickname already used in the class → nickname_taken
    insert into public.class_members (class_id, student_id, real_name, student_number, nickname)
    values (v_class.id, auth.uid(), public.clean_real_name(p_real_name), public.check_student_number(p_student_number), v_nick)
    on conflict (class_id, student_id) do nothing;
    get diagnostics v_n = row_count;
  exception when unique_violation then raise exception 'nickname_taken';
  end;
  if v_n = 0 then raise exception 'already_member'; end if;
  return jsonb_build_object('id', v_class.id, 'name', v_class.name);
end;
$$;

-- check_join_code: the live definition with only the code clean-up shared (clean_join_code).
create or replace function public.check_join_code(p_code text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_code text := public.clean_join_code(p_code);   -- Class tab: shared with join_class
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


-- 3. Student: my nickname in one class (any time, not in an archived class).
create or replace function public.set_my_nickname(p_class_id uuid, p_nickname text)
returns text language plpgsql security definer set search_path = ''
as $$
declare v text := public.clean_nickname(p_nickname);
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if (select c.archived from public.classes c where c.id = p_class_id) then raise exception 'class_archived'; end if;
  begin
    update public.class_members set nickname = v where class_id = p_class_id and student_id = auth.uid();
    if not found then raise exception 'not_member'; end if;
  exception when unique_violation then raise exception 'nickname_taken';
  end;
  return v;
end;
$$;

-- 4. Student: one of my classes for the クラス tab: name, teachers' names, my nickname, the switch.
create or replace function public.my_class_info(p_class_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_m public.class_members; v_c public.classes;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  select * into v_m from public.class_members m where m.class_id = p_class_id and m.student_id = auth.uid();
  if not found then raise exception 'not_member'; end if;
  select * into v_c from public.classes c where c.id = p_class_id;
  if v_c.archived then raise exception 'class_archived'; end if;
  return jsonb_build_object(
    'id', v_c.id, 'name', v_c.name, 'school_year', v_c.school_year,
    'leaderboard_enabled', v_c.leaderboard_enabled, 'nickname', v_m.nickname,
    'teachers', coalesce((select jsonb_agg(public.teacher_name(ct.teacher_id) order by ct.added_at)
                          from public.class_teachers ct
                          where ct.class_id = p_class_id and public.user_is_teacher(ct.teacher_id)), '[]'::jsonb));
end;
$$;

-- 5. The weekly leaderboard. Members and teachers of the class only (anyone else: not_member, also
--    for a class that doesn't exist). Archived: { enabled: false, archived: true }. Switched off:
--    students get { enabled: false } only; teachers still get the board (to preview it).
--    { enabled, archived, week_start, top: [{ rank, nickname, reviews, is_me, avatar }],
--      me: { nickname, rank, reviews } (members only; rank null with 0 reviews or no nickname),
--      last_week: [same as top, ranks 1–3] }. Ties at the cut-off are all included.
create or replace function public.class_leaderboard(p_class_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_me      uuid := auth.uid();
  v_c       public.classes;
  v_member  boolean;
  v_teacher boolean;
  v_week    date := date_trunc('week', (now() at time zone 'Asia/Tokyo')::date)::date;  -- this Monday
  v_top jsonb; v_last jsonb; v_mine jsonb;
begin
  if v_me is null then raise exception 'not_signed_in'; end if;
  select * into v_c from public.classes c where c.id = p_class_id;
  v_member  := exists (select 1 from public.class_members m where m.class_id = p_class_id and m.student_id = v_me);
  v_teacher := public.is_teacher_of_class(p_class_id);
  if v_c.id is null or not (v_member or v_teacher) then raise exception 'not_member'; end if;
  if v_c.archived then return jsonb_build_object('enabled', false, 'archived', true); end if;
  if not v_c.leaderboard_enabled and not v_teacher then
    return jsonb_build_object('enabled', false, 'archived', false);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('rank', r.rnk, 'nickname', r.nickname, 'reviews', r.reviews,
                                               'is_me', r.student_id = v_me,
                                               'avatar', public.leaderboard_avatar(r.student_id))
                            order by r.rnk, lower(r.nickname)), '[]'::jsonb)
    into v_top from public.class_week_ranks(p_class_id, v_week) r where r.rnk <= 10;

  select coalesce(jsonb_agg(jsonb_build_object('rank', r.rnk, 'nickname', r.nickname, 'reviews', r.reviews,
                                               'is_me', r.student_id = v_me,
                                               'avatar', public.leaderboard_avatar(r.student_id))
                            order by r.rnk, lower(r.nickname)), '[]'::jsonb)
    into v_last from public.class_week_ranks(p_class_id, v_week - 7) r where r.rnk <= 3;

  if v_member then
    select jsonb_build_object('nickname', m.nickname, 'rank', r.rnk, 'reviews', coalesce(r.reviews, 0))
      into v_mine
      from public.class_members m
      left join public.class_week_ranks(p_class_id, v_week) r on r.student_id = m.student_id
      where m.class_id = p_class_id and m.student_id = v_me;
  end if;

  return jsonb_build_object('enabled', v_c.leaderboard_enabled, 'archived', false, 'week_start', v_week,
                            'top', v_top, 'me', v_mine, 'last_week', v_last);
end;
$$;


-- 6. Teacher: the switch, and a student's nickname (blank = clear it, so the student is asked again).
create or replace function public.set_class_leaderboard(p_class_id uuid, p_enabled boolean)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_class_teacher(p_class_id);
  update public.classes set leaderboard_enabled = coalesce(p_enabled, true) where id = p_class_id;
end;
$$;

create or replace function public.set_member_nickname(p_class_id uuid, p_student_id uuid, p_nickname text)
returns text language plpgsql security definer set search_path = ''
as $$
declare v text;
begin
  perform public.require_class_teacher(p_class_id);
  v := case when nullif(btrim(coalesce(p_nickname, '')), '') is null then null else public.clean_nickname(p_nickname) end;
  begin
    update public.class_members set nickname = v where class_id = p_class_id and student_id = p_student_id;
    if not found then raise exception 'not_member'; end if;
  exception when unique_violation then raise exception 'nickname_taken';
  end;
  return v;
end;
$$;


-- 7. class_detail: the live definition plus each student's nickname and the class's leaderboard_enabled.
create or replace function public.class_detail(p_class_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  perform public.require_class_teacher(p_class_id);
  return (
    select jsonb_build_object(
      'class', jsonb_build_object('id', c.id, 'name', c.name, 'school_year', c.school_year,
                                  'join_code', c.join_code, 'archived', c.archived,
                                  'leaderboard_enabled', c.leaderboard_enabled),   -- Class tab
      'students', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'student_id', m.student_id, 'real_name', m.real_name, 'student_number', m.student_number,
                 'nickname', m.nickname,                                            -- Class tab
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


-- 8. Who may call what
revoke execute on function
  public.join_class(text, text, int, text), public.check_join_code(text), public.set_my_nickname(uuid, text),
  public.my_class_info(uuid), public.class_leaderboard(uuid), public.set_class_leaderboard(uuid, boolean),
  public.set_member_nickname(uuid, uuid, text), public.class_detail(uuid)
from public, anon;
grant execute on function
  public.join_class(text, text, int, text), public.check_join_code(text), public.set_my_nickname(uuid, text),
  public.my_class_info(uuid), public.class_leaderboard(uuid), public.set_class_leaderboard(uuid, boolean),
  public.set_member_nickname(uuid, uuid, text), public.class_detail(uuid)
to authenticated;

notify pgrst, 'reload schema';
