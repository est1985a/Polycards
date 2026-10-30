-- =====================================================================
-- Polycards: teacher area Phase 2 — student page and ticket awards (2026-10-30)
-- Run once in the Supabase SQL editor, AFTER polycards-teachers.sql and
-- polycards-gift-tickets.sql, BEFORE deploying the app code. Safe to run twice.
--
--   * Teachers can READ one student's study data (only students in a class
--     they teach, archived classes included). They can't change cards,
--     levels or settings.
--   * Teachers can give 1–10 tickets (with an optional message, max 60
--     characters) to students in a class they teach. Each award is also a
--     ticket_gifts row, so it counts through the normal ticket system and is
--     outside the 1-a-day review ticket cap.
--   * Students see their own new awards once (a pop-up), then they are
--     marked as seen.
--
-- The name students see on an award is the teacher's display_name (title
-- included, max 20 characters), set only here in the SQL editor:
--   update public.teachers set display_name = 'アンドレ先生'
--   where user_id = (select id from auth.users
--                    where lower(raw_user_meta_data->>'username') = 'test1' or lower(email) = 'test1');
-- Check them:
--   select u.email, t.display_name from public.teachers t join auth.users u on u.id = t.user_id;
-- Empty = the account name + 先生 (e.g. test1先生).
-- =====================================================================

-- 0. Teacher display name (only the SQL editor can set it: the teachers table has no grants)
alter table public.teachers add column if not exists display_name text;
alter table public.teachers drop constraint if exists teachers_display_name_length;
alter table public.teachers add constraint teachers_display_name_length
  check (display_name is null or char_length(display_name) between 1 and 20);

-- The name students see for a teacher: display_name, else the account name + 先生. Internal.
create or replace function public.teacher_name(p_user uuid)
returns text language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select nullif(btrim(t.display_name), '') from public.teachers t where t.user_id = p_user),
    public.user_display_name(p_user) || '先生')
$$;
revoke execute on function public.teacher_name(uuid) from public, anon, authenticated;

-- 1. Awards
create table if not exists public.ticket_awards (
  id         bigserial primary key,
  batch_id   uuid not null,                                     -- one "give" press (one or many students)
  class_id   uuid references public.classes(id) on delete set null,
  teacher_id uuid references auth.users(id) on delete set null,
  student_id uuid not null references auth.users(id) on delete cascade,
  amount     int  not null check (amount between 1 and 10),
  message    text check (message is null or char_length(message) between 1 and 60),
  created_at timestamptz not null default now(),
  seen_at    timestamptz                                        -- null until the student saw the pop-up
);
create index if not exists ticket_awards_student_idx on public.ticket_awards (student_id, created_at desc);
create index if not exists ticket_awards_class_idx   on public.ticket_awards (class_id, created_at desc);
create index if not exists ticket_awards_unseen_idx  on public.ticket_awards (student_id) where seen_at is null;

alter table public.ticket_awards enable row level security;
revoke all on public.ticket_awards from anon, authenticated;
grant select on public.ticket_awards to authenticated;
drop policy if exists "Read own awards or my students' awards" on public.ticket_awards;
create policy "Read own awards or my students' awards" on public.ticket_awards
  for select to authenticated
  using ((select auth.uid()) = student_id or public.is_teacher_of_student(student_id));

-- Which gift row each award made (null for gifts made by hand in the SQL editor).
alter table public.ticket_gifts add column if not exists award_id bigint references public.ticket_awards(id) on delete set null;


-- 2. Trouble words for any student (internal). my_trouble_words() now calls it with
--    the signed-in student, so the rule lives in one place. Same results as before.
--    The old my_trouble_words() is dropped first, so "create" never trips over a
--    different return type (and its grants are given again below).
create or replace function public.trouble_words_for(
  p_user uuid, p_days int default 30, p_min_misses int default 2, p_limit int default 10
)
returns table (word_id uuid, english text, japanese text, misses int, last_missed timestamptz, lowest_level int)
language sql stable security definer set search_path = ''
as $$
  with missed as (
    select a.word_id, count(*)::int as misses, max(a.answered_at) as last_missed
    from public.answer_log a
    where a.user_id = p_user
      and a.is_repeat = false
      and a.result in ('not_yet', 'dont_know')
      and a.answered_at > now() - make_interval(days => greatest(least(p_days, 365), 1))
    group by a.word_id
    having count(*) >= greatest(p_min_misses, 1)
  ),
  cards as (
    select c.word_id, min(c.level)::int as lowest_level
    from public.user_cards c
    where c.user_id = p_user
    group by c.word_id
  )
  select m.word_id, w.english, w.japanese, m.misses, m.last_missed, c.lowest_level
  from missed m
  join cards c        on c.word_id = m.word_id
  join public.words w on w.id = m.word_id
  where c.lowest_level < 8
  order by m.misses desc, m.last_missed desc
  limit greatest(least(p_limit, 50), 1)
$$;
revoke execute on function public.trouble_words_for(uuid, int, int, int) from public, anon, authenticated;

drop function if exists public.my_trouble_words(int, int, int);
create function public.my_trouble_words(p_days int default 30, p_min_misses int default 2, p_limit int default 10)
returns table (word_id uuid, english text, japanese text, misses int, last_missed timestamptz, lowest_level int)
language sql stable security definer set search_path = ''
as $$ select * from public.trouble_words_for(auth.uid(), p_days, p_min_misses, p_limit) $$;
revoke all on function public.my_trouble_words(int, int, int) from public, anon;
grant execute on function public.my_trouble_words(int, int, int) to authenticated;


-- 3. Teacher: one student's page. Only for a student in a class I teach (archived included).
--    Effort data only (no right/wrong answers): the same things the student's own stats page shows,
--    plus rank, tickets, cards per level, packs and awards.
create or replace function public.student_detail(p_class_id uuid, p_student_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_m public.class_members;
  v_u auth.users;
begin
  perform public.require_class_teacher(p_class_id);
  select * into v_m from public.class_members m where m.class_id = p_class_id and m.student_id = p_student_id;
  if not found then raise exception 'not_member'; end if;
  select * into v_u from auth.users u where u.id = p_student_id;

  return jsonb_build_object(
    'student', jsonb_build_object(
      'student_id', v_m.student_id, 'real_name', v_m.real_name, 'student_number', v_m.student_number,
      'display_name', public.user_display_name(p_student_id), 'email', v_u.email,
      'last_sign_in_at', v_u.last_sign_in_at),
    'last_studied_at', (select max(a.answered_at) from public.answer_log a where a.user_id = p_student_id),
    'avatar', (select jsonb_build_object('id', a.id, 'slug', a.slug, 'name_ja', a.name_ja, 'name_en', a.name_en,
                                         'rarity', a.rarity, 'image_url', a.image_url)
               from public.user_gacha g join public.avatars a on a.id = g.equipped_avatar_id
               where g.user_id = p_student_id),
    'peak_points',  coalesce((select s.peak_points  from public.user_stats s        where s.user_id = p_student_id), 0),
    'bonus_points', coalesce((select t.bonus_points from public.user_study_totals t where t.user_id = p_student_id), 0),
    'player_level', public.gacha_player_level(p_student_id),
    'tickets',      coalesce(public.gacha_tickets_available(p_student_id), 0),
    'level_counts', (select jsonb_agg(coalesce(c.n, 0) order by l.level)
                     from generate_series(0, 8) as l(level)
                     left join (select uc.level, count(*)::int as n from public.user_cards uc
                                where uc.user_id = p_student_id group by uc.level) c on c.level = l.level),
    'days', coalesce((select jsonb_agg(jsonb_build_object('day', d.day, 'reviews', d.reviews,
                                                          'spelled_correctly', d.spelled_correctly,
                                                          'bonus_points', d.bonus_points) order by d.day)
                      from public.user_study_daily d where d.user_id = p_student_id), '[]'::jsonb),
    'totals', jsonb_build_object(
      'reviews',           coalesce((select t.reviews from public.user_study_totals t where t.user_id = p_student_id), 0),
      'spelled_correctly', coalesce((select t.spelled_correctly from public.user_study_totals t where t.user_id = p_student_id), 0),
      'bonus_points',      coalesce((select t.bonus_points from public.user_study_totals t where t.user_id = p_student_id), 0)),
    'trouble', coalesce((select jsonb_agg(to_jsonb(tw) order by tw.misses desc, tw.last_missed desc)
                         from public.trouble_words_for(p_student_id) tw), '[]'::jsonb),
    'packs', coalesce((select jsonb_agg(jsonb_build_object(
                         'deck_id', d.id, 'name', d.name, 'added_at', ud.added_at,
                         'source', coalesce(tb.name || ' · ' || u.name,
                                            (select c.name from public.collection_decks cd
                                             join public.collections c on c.id = cd.collection_id
                                             where cd.deck_id = d.id order by c.id limit 1)))
                       order by ud.added_at)
                       from public.user_decks ud
                       join public.decks d on d.id = ud.deck_id
                       left join public.units u on u.id = d.unit_id
                       left join public.textbooks tb on tb.id = u.textbook_id
                       where ud.user_id = p_student_id), '[]'::jsonb),
    'awards', coalesce((select jsonb_agg(jsonb_build_object(
                          'id', a.id, 'teacher_name', public.teacher_name(a.teacher_id), 'amount', a.amount,
                          'message', a.message, 'created_at', a.created_at, 'seen', a.seen_at is not null,
                          'class_name', (select c.name from public.classes c where c.id = a.class_id))
                        order by a.created_at desc)
                        from (select * from public.ticket_awards x where x.student_id = p_student_id
                              order by x.created_at desc limit 50) a), '[]'::jsonb)
  );
end;
$$;


-- 4. Teacher: give tickets. All students must be in this class (not archived), amount 1–10,
--    message optional (max 60 characters). Everything happens in one transaction.
create or replace function public.award_tickets(p_class_id uuid, p_student_ids uuid[], p_amount int, p_message text default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_batch   uuid := gen_random_uuid();
  v_message text := nullif(btrim(regexp_replace(coalesce(p_message, ''), '\s+', ' ', 'g')), '');
  v_ids     uuid[];
  v_student uuid;
  v_award   bigint;
begin
  perform public.require_class_teacher(p_class_id);
  if (select c.archived from public.classes c where c.id = p_class_id) then raise exception 'class_archived'; end if;
  if p_amount is null or p_amount not between 1 and 10 then raise exception 'bad_amount'; end if;
  if v_message is not null and char_length(v_message) > 60 then raise exception 'message_too_long'; end if;
  select array_agg(distinct s) into v_ids from unnest(coalesce(p_student_ids, '{}'::uuid[])) as s where s is not null;
  if v_ids is null then raise exception 'no_students'; end if;
  if exists (select 1 from unnest(v_ids) as s
             where not exists (select 1 from public.class_members m where m.class_id = p_class_id and m.student_id = s)) then
    raise exception 'not_member';
  end if;

  foreach v_student in array v_ids loop
    perform public.gacha_ensure(v_student);
    insert into public.ticket_awards (batch_id, class_id, teacher_id, student_id, amount, message)
    values (v_batch, p_class_id, auth.uid(), v_student, p_amount, v_message)
    returning id into v_award;
    insert into public.ticket_gifts (user_id, tickets, note, award_id)
    values (v_student, p_amount, 'Teacher award', v_award);
  end loop;
  return jsonb_build_object('batch_id', v_batch, 'students', array_length(v_ids, 1), 'amount', p_amount);
end;
$$;

-- 5. Teacher: recent awards in a class, one row per "give" press.
create or replace function public.class_awards(p_class_id uuid, p_limit int default 20)
returns table (batch_id uuid, created_at timestamptz, teacher_name text, amount int, message text,
               student_count int, student_names text[])
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.require_class_teacher(p_class_id);
  return query
    select a.batch_id, min(a.created_at), public.teacher_name(a.teacher_id), a.amount, a.message,
           count(*)::int,
           array_agg(coalesce(m.real_name, public.user_display_name(a.student_id))
                     order by m.student_number nulls last, m.real_name)
    from public.ticket_awards a
    left join public.class_members m on m.class_id = a.class_id and m.student_id = a.student_id
    where a.class_id = p_class_id
    group by a.batch_id, a.teacher_id, a.amount, a.message
    order by min(a.created_at) desc
    limit greatest(least(coalesce(p_limit, 20), 100), 1);
end;
$$;


-- 6. Student: my awards not seen yet (oldest first), and marking them seen.
create or replace function public.my_unseen_awards()
returns table (id bigint, teacher_name text, amount int, message text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select a.id, public.teacher_name(a.teacher_id), a.amount, a.message, a.created_at
  from public.ticket_awards a
  where a.student_id = auth.uid() and a.seen_at is null
  order by a.created_at
$$;

-- Only the awards the pop-up showed (an award that arrives meanwhile stays unseen).
create or replace function public.mark_awards_seen(p_ids bigint[])
returns int language plpgsql security definer set search_path = ''
as $$
declare v_n int;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  update public.ticket_awards a set seen_at = now()
  where a.student_id = auth.uid() and a.seen_at is null and a.id = any(coalesce(p_ids, '{}'::bigint[]));
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;


-- 7. Who may call what
revoke execute on function
  public.student_detail(uuid, uuid), public.award_tickets(uuid, uuid[], int, text),
  public.class_awards(uuid, int), public.my_unseen_awards(), public.mark_awards_seen(bigint[])
from public, anon;
grant execute on function
  public.student_detail(uuid, uuid), public.award_tickets(uuid, uuid[], int, text),
  public.class_awards(uuid, int), public.my_unseen_awards(), public.mark_awards_seen(bigint[])
to authenticated;
