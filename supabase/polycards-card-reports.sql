-- =====================================================================
-- Polycards: card reports (2026-10-31)
-- Run BEFORE deploying the app code that has the report flag. Safe to run twice.
-- Then run supabase/check-card-reports-security.sql (every row should say PASS).
--
--   * card_reports: a student reports a problem with a card (spelling, meaning, example,
--     audio…). Students can't read or change the table at all: they only send reports
--     through submit_card_report() and add a screenshot with attach_report_screenshot().
--   * At most 20 reports per student per Japan-time day (report_limit), and one open report
--     per student + word + direction + reason (already_reported).
--   * Screenshots go to the PRIVATE bucket report-screenshots, as {user id}/{report id}.jpg.
--     Students may only upload into their own folder; nobody but you can look at the files.
--   * card_reports_readable: the view you read in the SQL editor (newest first).
--     Snippets for reading and closing reports are at the bottom of this file.
-- =====================================================================

-- 0. Check the live schema first: the table points at words.id and decks.id (uuids), and the
--    direction values must be the ones the app uses.
do $$
begin
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'words' and column_name = 'id') is distinct from 'uuid' then
    raise exception 'words.id is not a uuid. Nothing was changed; tell Claude.';
  end if;
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'decks' and column_name = 'id') is distinct from 'uuid' then
    raise exception 'decks.id is not a uuid. Nothing was changed; tell Claude.';
  end if;
  if exists (select 1 from public.user_cards where direction not in ('en2jp', 'jp2en')) then
    raise exception 'user_cards has a direction other than en2jp / jp2en. Nothing was changed; tell Claude.';
  end if;
end $$;

-- 1. Table
create table if not exists public.card_reports (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  word_id          uuid not null references public.words(id) on delete cascade,
  direction        text check (direction in ('en2jp', 'jp2en')),           -- null: reported from the word list
  deck_id          uuid references public.decks(id) on delete set null,     -- null: the general review
  source           text not null check (source in ('review', 'drill', 'word_list')),
  reason           text not null check (reason in ('spelling', 'meaning', 'example', 'accept_answer',
                                                   'handwriting', 'audio', 'pos', 'display', 'other')),
  note             text check (note is null or char_length(note) between 1 and 500),
  submitted_answer text check (submitted_answer is null or char_length(submitted_answer) between 1 and 100),
  answer_mode      text check (answer_mode in ('tap', 'typing', 'handwriting')),
  context          jsonb not null default '{}'::jsonb,                      -- theme, language, screen size, browser, app version
  screenshot_path  text check (screenshot_path is null or char_length(screenshot_path) <= 200),
  status           text not null default 'open' check (status in ('open', 'fixed', 'wont_fix')),
  admin_note       text,
  resolved_at      timestamptz
);
-- One open report per student + word + direction (blank for the word list) + reason.
create unique index if not exists card_reports_one_open
  on public.card_reports (user_id, word_id, coalesce(direction, ''), reason) where status = 'open';
create index if not exists card_reports_user_time on public.card_reports (user_id, created_at);
create index if not exists card_reports_word on public.card_reports (word_id);

-- Students never touch the table directly: RLS on, no policies, no privileges.
alter table public.card_reports enable row level security;
revoke all on table public.card_reports from public, anon, authenticated;

-- 2. Send a report. Returns the new report's id.
-- Errors: not_signed_in, bad_report (unknown reason / source / direction / answer mode),
-- note_too_long, answer_too_long, word_not_found, report_limit (20 a day, Japan time),
-- already_reported (the same open report exists).
create or replace function public.submit_card_report(
  p_word_id uuid, p_direction text, p_deck_id uuid, p_source text, p_reason text,
  p_note text default null, p_submitted_answer text default null, p_answer_mode text default null,
  p_context jsonb default null)
returns uuid language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_day    date := (now() at time zone 'Asia/Tokyo')::date;
  v_note   text := nullif(btrim(coalesce(p_note, '')), '');
  v_answer text := nullif(btrim(coalesce(p_submitted_answer, '')), '');
  v_deck   uuid;
  v_ctx    jsonb := '{}'::jsonb;
  v_id     uuid;
begin
  if v_user is null then raise exception 'not_signed_in'; end if;
  if p_reason is null or p_reason not in ('spelling', 'meaning', 'example', 'accept_answer',
                                          'handwriting', 'audio', 'pos', 'display', 'other')
     or p_source is null or p_source not in ('review', 'drill', 'word_list')
     or (p_direction is not null and p_direction not in ('en2jp', 'jp2en'))
     or (p_answer_mode is not null and p_answer_mode not in ('tap', 'typing', 'handwriting')) then
    raise exception 'bad_report';
  end if;
  if char_length(v_note) > 500 then raise exception 'note_too_long'; end if;
  if char_length(v_answer) > 100 then raise exception 'answer_too_long'; end if;
  if not exists (select 1 from public.words w where w.id = p_word_id) then raise exception 'word_not_found'; end if;
  -- A deck that doesn't exist (any more) is simply left out.
  select d.id into v_deck from public.decks d where d.id = p_deck_id;
  -- Only the context keys the app sends, each cut to 300 characters.
  if jsonb_typeof(p_context) = 'object' then
    v_ctx := jsonb_strip_nulls(jsonb_build_object(
      'theme',     left(p_context->>'theme', 300),
      'lang',      left(p_context->>'lang', 300),
      'viewport',  left(p_context->>'viewport', 300),
      'userAgent', left(p_context->>'userAgent', 300),
      'commit',    left(p_context->>'commit', 300),
      'page',      left(p_context->>'page', 300)));
  end if;

  -- One student at a time, so two quick taps can't both slip under the daily limit.
  perform pg_advisory_xact_lock(hashtext('card_reports:' || v_user::text));
  if exists (select 1 from public.card_reports r
             where r.user_id = v_user and r.word_id = p_word_id and coalesce(r.direction, '') = coalesce(p_direction, '')
               and r.reason = p_reason and r.status = 'open') then
    raise exception 'already_reported';
  end if;
  if (select count(*) from public.card_reports r
      where r.user_id = v_user and r.created_at >= (v_day::timestamp at time zone 'Asia/Tokyo')) >= 20 then
    raise exception 'report_limit';
  end if;

  begin
    insert into public.card_reports (user_id, word_id, direction, deck_id, source, reason, note,
                                     submitted_answer, answer_mode, context)
    values (v_user, p_word_id, p_direction, v_deck, p_source, p_reason, v_note, v_answer, p_answer_mode, v_ctx)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'already_reported';
  end;
  return v_id;
end;
$$;
revoke execute on function public.submit_card_report(uuid, text, uuid, text, text, text, text, text, jsonb) from public, anon;
grant execute on function public.submit_card_report(uuid, text, uuid, text, text, text, text, text, jsonb) to authenticated;

-- 3. Add the screenshot to my own report, once. The path must be exactly {my user id}/{report id}.jpg
-- (the file the app uploads). Error: report_not_found (not mine, already has one, or a wrong path).
create or replace function public.attach_report_screenshot(p_report_id uuid, p_path text)
returns void language plpgsql volatile security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  update public.card_reports r
     set screenshot_path = p_path
   where r.id = p_report_id and r.user_id = auth.uid() and r.screenshot_path is null
     and p_path = auth.uid()::text || '/' || p_report_id::text || '.jpg';
  if not found then raise exception 'report_not_found'; end if;
end;
$$;
revoke execute on function public.attach_report_screenshot(uuid, text) from public, anon;
grant execute on function public.attach_report_screenshot(uuid, text) to authenticated;

-- 4. The view you read (SQL editor only). security_invoker: even if someone granted it by
-- mistake, a student would still see nothing (RLS on card_reports, no access to auth.users).
create or replace view public.card_reports_readable with (security_invoker = true) as
select r.id, r.created_at, r.status,
       w.english, w.japanese, w.pos,
       d.name as deck_name,
       public.user_display_name(r.user_id) as student_name, u.email as student_email,
       r.source, r.direction, r.reason, r.note, r.submitted_answer, r.answer_mode,
       r.screenshot_path, r.context, r.admin_note, r.resolved_at, r.word_id, r.deck_id, r.user_id
from public.card_reports r
join public.words w on w.id = r.word_id
left join public.decks d on d.id = r.deck_id
left join auth.users u on u.id = r.user_id
order by r.created_at desc;
revoke all on table public.card_reports_readable from public, anon, authenticated;

-- 5. Screenshots: a PRIVATE bucket (2 MB, JPEG only). Students may only upload (INSERT) into their
-- own folder; no select, update or delete, so nobody can look at or replace anyone's files.
-- If the policy statement fails with "must be owner of table objects", add the same policy in the
-- dashboard instead: Storage → Policies → report-screenshots → New policy → INSERT, role
-- authenticated, WITH CHECK = the expression below.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-screenshots', 'report-screenshots', false, 2097152, array['image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Students upload own report screenshots" on storage.objects;
create policy "Students upload own report screenshots" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'report-screenshots' and (storage.foldername(name))[1] = (select auth.uid())::text);


-- =====================================================================
-- READING REPORTS (copy one snippet at a time into the SQL editor)
-- =====================================================================
-- Open reports, newest first:
--   select created_at, english, japanese, deck_name, student_name, source, reason, note,
--          submitted_answer, answer_mode, screenshot_path, id
--   from public.card_reports_readable where status = 'open';
--
-- Reports per word (which cards need fixing first):
--   select english, japanese, count(*) as reports, array_agg(distinct reason) as reasons
--   from public.card_reports_readable where status = 'open'
--   group by english, japanese order by reports desc;
--
-- A screenshot: Storage → report-screenshots → the folder named after the student's user id →
-- {report id}.jpg (the screenshot_path column) → Download, or Get URL for a link that expires.
--
-- Close a report after fixing the card (or deciding not to):
--   update public.card_reports set status = 'fixed', admin_note = 'spelling fixed', resolved_at = now()
--   where id = '<report id>';
--   update public.card_reports set status = 'wont_fix', admin_note = 'the textbook says so', resolved_at = now()
--   where id = '<report id>';
-- A closed report frees the student to report the same thing again.
--
-- Screenshots of deleted accounts (their reports are deleted with the account, the files stay).
-- Supabase doesn't allow deleting files with SQL; this lists them, delete them in Storage:
--   select o.name from storage.objects o
--   where o.bucket_id = 'report-screenshots'
--     and not exists (select 1 from auth.users u where u.id::text = (storage.foldername(o.name))[1]);
