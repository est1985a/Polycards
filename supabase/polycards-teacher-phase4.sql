-- =====================================================================
-- Polycards: teacher area Phase 4 — assigned packs (2026-10-30)
-- Run AFTER polycards-class-tab.sql, BEFORE deploying the app code. Safe to run twice.
-- No existing function is changed; everything here is new.
--
--   * class_assignments: one pack (deck) per row, at most once per class, with an optional
--     due date (a Japan date) and note (max 60 characters). No grants: read and written only
--     through the functions below.
--   * Progress = the deck's cards (both directions) the student has at level >= 1, out of
--     the deck's words x 2. Progress belongs to the word, so a word learned through another
--     pack counts too.
--   * Teachers: create / edit / delete in classes they teach (not archived), and the whole
--     class's progress on every assignment in one call. Deleting never touches My Decks.
--   * Students: only their own progress, only in their own classes.
-- =====================================================================

-- 0. The new table points at decks.id, which must be a uuid.
do $$
begin
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'decks' and column_name = 'id') is distinct from 'uuid' then
    raise exception 'decks.id is not a uuid. Nothing was changed; tell Claude.';
  end if;
end $$;

-- 1. Table
create table if not exists public.class_assignments (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  deck_id    uuid not null references public.decks(id) on delete cascade,
  due_date   date,                                   -- Japan date; null = no due date
  note       text check (note is null or char_length(note) between 1 and 60),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, deck_id)
);
create index if not exists class_assignments_deck_idx on public.class_assignments (deck_id);

alter table public.class_assignments enable row level security;
revoke all on public.class_assignments from anon, authenticated;


-- 2. Internal helpers (not callable from the app)

-- A note as stored: spaces collapsed, trimmed, '' = null; more than 60 characters = note_too_long.
create or replace function public.clean_assignment_note(p_note text)
returns text language plpgsql immutable set search_path = ''
as $$
declare v text := nullif(btrim(regexp_replace(coalesce(p_note, ''), '\s+', ' ', 'g')), '');
begin
  if v is not null and char_length(v) > 60 then raise exception 'note_too_long'; end if;
  return v;
end;
$$;

-- Where a pack comes from: "textbook · unit", else its first collection (same rule as student_detail).
create or replace function public.deck_source(p_deck_id uuid)
returns text language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select tb.name || ' · ' || u.name
     from public.decks d
     join public.units u on u.id = d.unit_id
     join public.textbooks tb on tb.id = u.textbook_id
     where d.id = p_deck_id),
    (select c.name from public.collection_decks cd
     join public.collections c on c.id = cd.collection_id
     where cd.deck_id = p_deck_id order by c.id limit 1))
$$;

-- Progress of a class's members on every assignment of the class (p_student null = all members).
-- One row per assignment x member: added (deck in My Deck), owned (the deck's cards the student has),
-- learned (of those, level >= 1, Mastered included), total (the deck's words x 2).
create or replace function public.assignment_progress_for(p_class_id uuid, p_student uuid default null)
returns table (assignment_id uuid, student_id uuid, added boolean, owned int, learned int, total int)
language sql stable security definer set search_path = ''
as $$
  with a as (
    select ca.id, ca.deck_id from public.class_assignments ca where ca.class_id = p_class_id
  ),
  w as (   -- each assignment's words, once each
    select distinct a.id as assignment_id, dw.word_id
    from a join public.deck_words dw on dw.deck_id = a.deck_id
  ),
  t as (
    select w.assignment_id, (count(*) * 2)::int as total from w group by w.assignment_id
  ),
  m as (
    select cm.student_id from public.class_members cm
    where cm.class_id = p_class_id and (p_student is null or cm.student_id = p_student)
  ),
  c as (
    select w.assignment_id, uc.user_id, count(*)::int as owned,
           (count(*) filter (where uc.level >= 1))::int as learned
    from w
    join public.user_cards uc on uc.word_id = w.word_id
    join m on m.student_id = uc.user_id
    group by w.assignment_id, uc.user_id
  )
  select a.id, m.student_id,
         exists (select 1 from public.user_decks ud where ud.user_id = m.student_id and ud.deck_id = a.deck_id),
         coalesce(c.owned, 0), coalesce(c.learned, 0), coalesce(t.total, 0)
  from a
  cross join m
  left join t on t.assignment_id = a.id
  left join c on c.assignment_id = a.id and c.user_id = m.student_id
$$;

revoke execute on function public.clean_assignment_note(text), public.deck_source(uuid),
  public.assignment_progress_for(uuid, uuid) from public, anon, authenticated;


-- 3. Teacher: the class's assignments with every member's progress, in one call (archived included).
--    students: [{ student_id, added, owned, learned, total }] (names come from class_detail in the app).
create or replace function public.assignments_for_class(p_class_id uuid)
returns table (id uuid, deck_id uuid, deck_name text, source text, word_count int, due_date date,
               note text, created_at timestamptz, teacher_name text, students jsonb)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.require_class_teacher(p_class_id);
  return query
    with p as (select * from public.assignment_progress_for(p_class_id)),
    agg as (
      select p.assignment_id,
             jsonb_agg(jsonb_build_object('student_id', p.student_id, 'added', p.added,
                                          'owned', p.owned, 'learned', p.learned, 'total', p.total)) as students
      from p group by p.assignment_id
    )
    select ca.id, ca.deck_id, d.name, public.deck_source(d.id),
           (select count(distinct dw.word_id)::int from public.deck_words dw where dw.deck_id = ca.deck_id),
           ca.due_date, ca.note, ca.created_at, public.teacher_name(ca.created_by),
           coalesce(agg.students, '[]'::jsonb)
    from public.class_assignments ca
    join public.decks d on d.id = ca.deck_id
    left join agg on agg.assignment_id = ca.id
    where ca.class_id = p_class_id
    order by ca.due_date nulls last, ca.created_at desc;
end;
$$;

-- 4. Teacher: create / edit / delete (class not archived).
create or replace function public.create_assignment(p_class_id uuid, p_deck_id uuid,
                                                    p_due_date date default null, p_note text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid; v_note text;
begin
  perform public.require_class_teacher(p_class_id);
  if (select c.archived from public.classes c where c.id = p_class_id) then raise exception 'class_archived'; end if;
  if not exists (select 1 from public.decks d where d.id = p_deck_id) then raise exception 'deck_not_found'; end if;
  if p_due_date is not null and p_due_date not between date '2000-01-01' and date '2100-12-31' then
    raise exception 'bad_due_date';
  end if;
  v_note := public.clean_assignment_note(p_note);
  insert into public.class_assignments (class_id, deck_id, due_date, note, created_by)
  values (p_class_id, p_deck_id, p_due_date, v_note, auth.uid())
  on conflict (class_id, deck_id) do nothing
  returning id into v_id;
  if v_id is null then raise exception 'already_assigned'; end if;
  return v_id;
end;
$$;

-- The class an assignment belongs to, after the teacher checks (internal).
create or replace function public.assignment_class_for_teacher(p_assignment_id uuid)
returns uuid language plpgsql stable security definer set search_path = ''
as $$
declare v_class uuid;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if not public.is_teacher() then raise exception 'not_teacher'; end if;
  select ca.class_id into v_class from public.class_assignments ca where ca.id = p_assignment_id;
  if v_class is null then raise exception 'assignment_not_found'; end if;
  perform public.require_class_teacher(v_class);
  if (select c.archived from public.classes c where c.id = v_class) then raise exception 'class_archived'; end if;
  return v_class;
end;
$$;
revoke execute on function public.assignment_class_for_teacher(uuid) from public, anon, authenticated;

create or replace function public.update_assignment(p_assignment_id uuid, p_due_date date, p_note text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.assignment_class_for_teacher(p_assignment_id);
  if p_due_date is not null and p_due_date not between date '2000-01-01' and date '2100-12-31' then
    raise exception 'bad_due_date';
  end if;
  update public.class_assignments
  set due_date = p_due_date, note = public.clean_assignment_note(p_note), updated_at = now()
  where id = p_assignment_id;
end;
$$;

-- Only the assignment row goes: students' My Decks and cards are never touched.
create or replace function public.delete_assignment(p_assignment_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform public.assignment_class_for_teacher(p_assignment_id);
  delete from public.class_assignments where id = p_assignment_id;
end;
$$;

-- 5. Student: my own progress on one of my classes' assignments (never classmates').
create or replace function public.my_class_assignments(p_class_id uuid)
returns table (id uuid, deck_id uuid, deck_name text, source text, word_count int, due_date date,
               note text, created_at timestamptz, added boolean, owned int, learned int, total int)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if not exists (select 1 from public.class_members m where m.class_id = p_class_id and m.student_id = auth.uid()) then
    raise exception 'not_member';
  end if;
  if (select c.archived from public.classes c where c.id = p_class_id) then raise exception 'class_archived'; end if;
  return query
    select ca.id, ca.deck_id, d.name, public.deck_source(d.id), p.total / 2, ca.due_date, ca.note, ca.created_at,
           p.added, p.owned, p.learned, p.total
    from public.assignment_progress_for(p_class_id, auth.uid()) p
    join public.class_assignments ca on ca.id = p.assignment_id
    join public.decks d on d.id = ca.deck_id;
end;
$$;

-- Student: how many assignments (all my classes, not archived) are not in My Deck yet and not done.
-- For the dot on the クラス tab.
create or replace function public.my_pending_assignments()
returns int language sql stable security definer set search_path = ''
as $$
  select count(*)::int
  from public.class_members m
  join public.classes c on c.id = m.class_id and not c.archived
  cross join lateral public.assignment_progress_for(m.class_id, m.student_id) p
  where m.student_id = auth.uid() and not p.added and p.learned < p.total
$$;

-- 6. Who may call what
revoke execute on function
  public.assignments_for_class(uuid), public.create_assignment(uuid, uuid, date, text),
  public.update_assignment(uuid, date, text), public.delete_assignment(uuid),
  public.my_class_assignments(uuid), public.my_pending_assignments()
from public, anon;
grant execute on function
  public.assignments_for_class(uuid), public.create_assignment(uuid, uuid, date, text),
  public.update_assignment(uuid, date, text), public.delete_assignment(uuid),
  public.my_class_assignments(uuid), public.my_pending_assignments()
to authenticated;

notify pgrst, 'reload schema';
