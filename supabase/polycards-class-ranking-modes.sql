-- =====================================================================
-- Polyvo: class ranking by correct typing and handwriting answers (2026-11-05)
-- Run AFTER polycards-class-tab.sql and polycards-teacher-phase3.sql. Safe to run twice.
-- Can be run BEFORE the app code is deployed: class_leaderboard() keeps every key it returned
-- before (top / me / last_week, by reviews) and only ADDS `boards`, so the live app keeps working.
--
-- Why: the old board ranked by reviews, which a student can win by tapping わかった as fast as
-- possible. The main boards now count only answers that take effort:
--   * typing      = first answers typed and spelled correctly
--   * handwriting = first answers handwritten and read correctly
--   * reviews     = first answers of any kind (shown small, top 3)
--
-- What counts (answer_log, the Japan week Monday 00:00 – next Monday 00:00, Asia/Tokyo):
--   is_repeat = false             a まだ card coming back in the same session never counts again;
--                                 a first answer is only allowed on a due card (record_answer), and a
--                                 correct spelling levels the card up (due again 4 h later at the earliest)
--   spelling = 'exact'            the main word OR an accepted alternate (spelling_check with
--                                 alt_answers). Handwriting with a look-alike warning is also 'exact',
--                                 because the app sends the target word while LENIENT_GIVES_BONUS is
--                                 true (src/handwriting/config.js)
--   answer_mode = the board       'typing' | 'handwriting' (NULL only on rows older than Phase 3)
-- Every answer_log row is a My Deck review answer: record_answer() is the only function that inserts
-- into answer_log, and the app calls it only from the SRS review (the おためしドリル, writing practice,
-- Training and 元に戻す never write a row). IF ANOTHER WRITER IS EVER ADDED, filter it out here.
--
-- Order and ties: rank() by count (ties share a rank: 1, 2, 2, 4). Within the same rank, whoever
-- reached that count first is listed first (earliest time of their last counted answer this week),
-- then the nickname. Each board shows ranks up to TOP_RANK (typing / handwriting 5, reviews 3) but
-- at most MAX_ROWS rows (7 / 5); `more` = how many tied students were left out (the app shows
-- ＋N人 同点). Last week: the first 3 rows by the same order.
--
-- Privacy: the same as before. Only rank, nickname, count, is_me and the Polyavatar picture (slug,
-- rarity, image_url; never the name) leave the database. Never user ids, real names or emails.
-- Switched off (students) and archived classes return before any board is built.
-- =====================================================================

-- 1. Internal: one class's ranking for one board and one week (not callable from the app).
-- p_board: 'typing' | 'handwriting' | 'reviews'. Members with a nickname and count > 0 only.
-- pos = the display order (count, then who reached it first, then nickname).
create or replace function public.class_week_board_ranks(p_class_id uuid, p_from date, p_board text)
returns table (student_id uuid, nickname text, cnt int, reached_at timestamptz, rnk int, pos int)
language sql stable security definer set search_path = ''
as $$
  with counted as (
    select m.student_id, m.nickname, count(*)::int as cnt, max(l.answered_at) as reached_at
    from public.class_members m
    join public.answer_log l
      on l.user_id = m.student_id
     and l.answered_at >= (p_from::timestamp at time zone 'Asia/Tokyo')
     and l.answered_at <  ((p_from + 7)::timestamp at time zone 'Asia/Tokyo')
     and l.is_repeat = false
     and (p_board = 'reviews'
          or (p_board in ('typing', 'handwriting') and l.spelling = 'exact' and l.answer_mode = p_board))
    where m.class_id = p_class_id and m.nickname is not null
    group by m.student_id, m.nickname
  )
  select c.student_id, c.nickname, c.cnt, c.reached_at,
         (rank() over (order by c.cnt desc))::int,
         (row_number() over (order by c.cnt desc, c.reached_at, lower(c.nickname)))::int
  from counted c
$$;

-- 2. Internal: one board as JSON: { top, more, me, last_week? }.
create or replace function public.class_board_json(p_class_id uuid, p_week date, p_board text, p_me uuid,
                                                   p_member boolean, p_top_rank int, p_max_rows int,
                                                   p_with_last boolean)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_top jsonb; v_more int; v_mine jsonb; v_last jsonb;
begin
  with r as (select * from public.class_week_board_ranks(p_class_id, p_week, p_board) where rnk <= p_top_rank)
  select coalesce(jsonb_agg(jsonb_build_object('rank', r.rnk, 'nickname', r.nickname, 'count', r.cnt,
                                               'is_me', r.student_id = p_me,
                                               'avatar', public.leaderboard_avatar(r.student_id))
                            order by r.pos) filter (where r.pos <= p_max_rows), '[]'::jsonb),
         count(*) filter (where r.pos > p_max_rows)::int
    into v_top, v_more from r;

  if p_member then
    select jsonb_build_object('rank', r.rnk, 'count', coalesce(r.cnt, 0))
      into v_mine
      from (select 1) one
      left join public.class_week_board_ranks(p_class_id, p_week, p_board) r on r.student_id = p_me;
  end if;

  if p_with_last then
    select coalesce(jsonb_agg(jsonb_build_object('rank', r.rnk, 'nickname', r.nickname, 'count', r.cnt,
                                                 'is_me', r.student_id = p_me,
                                                 'avatar', public.leaderboard_avatar(r.student_id))
                              order by r.pos), '[]'::jsonb)
      into v_last from public.class_week_board_ranks(p_class_id, p_week - 7, p_board) r where r.pos <= 3;
  end if;

  return jsonb_build_object('top', v_top, 'more', v_more, 'me', v_mine)
         || case when p_with_last then jsonb_build_object('last_week', v_last) else '{}'::jsonb end;
end;
$$;

revoke execute on function
  public.class_week_board_ranks(uuid, date, text),
  public.class_board_json(uuid, date, text, uuid, boolean, int, int, boolean)
from public, anon, authenticated;


-- 3. class_leaderboard: rebuilt from the live definition (pg_get_functiondef, 2026-11-05; identical
-- to polycards-class-tab.sql). Same signature, return type, STABLE, SECURITY DEFINER and search_path.
-- Only change: the `boards` key (marked "Ranking modes").
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
  v_boards  jsonb;  -- Ranking modes
  -- Ranking modes: how many ranks each board shows, and the most rows when ties pile up.
  c_mode_top_rank   constant int := 5;
  c_mode_max_rows   constant int := 7;
  c_review_top_rank constant int := 3;
  c_review_max_rows constant int := 5;
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

  -- Ranking modes
  v_boards := jsonb_build_object(
    'typing',      public.class_board_json(p_class_id, v_week, 'typing', v_me, v_member,
                                           c_mode_top_rank, c_mode_max_rows, true),
    'handwriting', public.class_board_json(p_class_id, v_week, 'handwriting', v_me, v_member,
                                           c_mode_top_rank, c_mode_max_rows, true),
    'reviews',     public.class_board_json(p_class_id, v_week, 'reviews', v_me, v_member,
                                           c_review_top_rank, c_review_max_rows, false));

  return jsonb_build_object('enabled', v_c.leaderboard_enabled, 'archived', false, 'week_start', v_week,
                            'top', v_top, 'me', v_mine, 'last_week', v_last, 'boards', v_boards);
end;
$$;

-- 4. Who may call what (unchanged: signed-in users only; create or replace keeps the grants, this
-- just makes sure).
revoke execute on function public.class_leaderboard(uuid) from public, anon;
grant execute on function public.class_leaderboard(uuid) to authenticated;

notify pgrst, 'reload schema';

-- 5. Check the grants (expect: class_leaderboard → authenticated (+ postgres / service_role);
-- the two helpers → no anon, no authenticated):
-- select routine_name, grantee, privilege_type from information_schema.routine_privileges
-- where routine_schema = 'public'
--   and routine_name in ('class_leaderboard', 'class_week_board_ranks', 'class_board_json')
-- order by 1, 2;

-- 6. Peek at this week's boards for one class (SQL editor; replace the class name):
-- select b.board, r.rnk, r.nickname, r.cnt, r.reached_at at time zone 'Asia/Tokyo' as reached_jst
-- from (values ('typing'), ('handwriting'), ('reviews')) b(board)
-- cross join lateral public.class_week_board_ranks(
--   (select id from public.classes where name = '1年A組' limit 1),
--   date_trunc('week', (now() at time zone 'Asia/Tokyo')::date)::date, b.board) r
-- order by b.board, r.pos;
