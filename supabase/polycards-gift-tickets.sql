-- =====================================================================
-- Polycards: teacher gift tickets (2026-10-24)
-- Run once in the Supabase SQL editor, AFTER polycards-spelling-tickets.sql.
--
-- Lets you give (or take back) gacha tickets for one student:
--
--   select public.gacha_gift_tickets('aiden', 3, 'Helped test the app');
--   select public.gacha_gift_tickets('someone@gmail.com', 1, 'Won the class quiz');
--   select public.gacha_gift_tickets('test1', -1, 'Gave one too many');
--
-- Who: a test-account username (aiden, amaya, test1 ...) or the student's
-- full email address (for Google accounts).
-- How many: 1 to 50 at a time. A minus number takes tickets back
-- (only up to what the student has right now).
-- Note: optional, just for your own record.
--
-- Every gift is saved in ticket_gifts, so you can see who got what and why.
-- Gifts are outside the 1-a-day review cap. Students can't call the gift
-- function or read the gift list; only the SQL editor (or Claude-written
-- SQL that you run) can.
-- =====================================================================

-- 1. The gift record
create table if not exists public.ticket_gifts (
  id        bigserial primary key,
  user_id   uuid not null references auth.users(id) on delete cascade,
  tickets   int  not null check (tickets <> 0 and tickets between -50 and 50),
  note      text,
  given_at  timestamptz not null default now()
);
alter table public.ticket_gifts enable row level security;   -- no policies: students can't see it
revoke all on public.ticket_gifts from anon, authenticated;


-- 2. Total gifted tickets for one student
create or replace function public.gacha_gifted_tickets(p_user uuid)
returns int
language sql stable
security definer
set search_path = ''
as $$
  select coalesce((select sum(t.tickets) from public.ticket_gifts t where t.user_id = p_user), 0)::int
$$;


-- 3. Tickets available now:
--    free first ticket + review tickets + spelling tickets + rank bonus + gifts - used
create or replace function public.gacha_tickets_available(p_user uuid)
returns int
language sql stable
security definer
set search_path = ''
as $$
  select greatest(0,
           (case when g.reviews_counted >= 1 then 1 else 0 end)
         + g.earned_tickets
         + floor(public.gacha_spelling_points(p_user)
                 / public.gacha_setting('spelling_points_per_ticket'))::int
         + (public.gacha_player_level(p_user) / 10)
         + public.gacha_gifted_tickets(p_user)
         - g.tickets_spent)
  from public.user_gacha g
  where g.user_id = p_user
$$;


-- 4. Give tickets: by username or email
create or replace function public.gacha_gift_tickets(p_who text, p_tickets int, p_note text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_who  text := lower(trim(p_who));
  v_ids  uuid[];
  v_user uuid;
  v_email text;
begin
  if p_tickets is null or p_tickets = 0 or p_tickets not between -50 and 50 then
    raise exception 'Tickets must be between -50 and 50 (and not 0).';
  end if;

  -- Find the student: exact email, or a test-account username
  select array_agg(u.id) into v_ids
  from auth.users u
  where lower(u.email) = v_who
     or (position('@' in v_who) = 0
         and (lower(u.raw_user_meta_data->>'username') = v_who
              or lower(u.email) = v_who || '@polycards.test'));

  if v_ids is null then
    raise exception 'No account found for "%". Use a username (e.g. aiden) or the full email address.', p_who;
  end if;
  if array_length(v_ids, 1) > 1 then
    raise exception 'More than one account matches "%". Use the full email address instead.', p_who;
  end if;
  v_user := v_ids[1];
  select u.email into v_email from auth.users u where u.id = v_user;

  -- Make sure the student has a gacha row (in case they haven't opened the gacha yet)
  perform public.gacha_ensure(v_user);

  -- Taking back: never more than they have now (so no hidden "debt"
  -- eats tickets they earn later)
  if p_tickets < 0 then
    p_tickets := -least(-p_tickets, public.gacha_tickets_available(v_user));
    if p_tickets = 0 then
      raise exception '% has no tickets to take back.', v_email;
    end if;
  end if;

  insert into public.ticket_gifts (user_id, tickets, note) values (v_user, p_tickets, p_note);

  return format('%s %s ticket(s) %s %s. They now have %s ticket(s).',
                case when p_tickets > 0 then 'Gave' else 'Took back' end,
                abs(p_tickets),
                case when p_tickets > 0 then 'to' else 'from' end,
                v_email,
                public.gacha_tickets_available(v_user));
end;
$$;


-- 5. Students can't call these
revoke execute on function public.gacha_gifted_tickets(uuid) from public, anon, authenticated;
revoke execute on function public.gacha_gift_tickets(text, int, text) from public, anon, authenticated;


-- 6. Check: list of all gifts so far (empty right after setup)
select u.email, g.tickets, g.note, g.given_at at time zone 'Asia/Tokyo' as given_at_japan
from public.ticket_gifts g
join auth.users u on u.id = g.user_id
order by g.given_at desc;
