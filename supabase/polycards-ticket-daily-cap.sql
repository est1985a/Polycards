-- =====================================================================
-- Polycards: daily cap on review tickets
-- Run once in the Supabase SQL editor, after polycards-gacha.sql.
--
-- Rule: 100 reviews still earn 1 ガチャ券, but at most 1 per day
-- (Japan time, resets at midnight). Once a student has earned today's
-- ticket, progress fills to 100 and waits there; the ticket arrives the
-- next day (as soon as they open the gacha or answer a card).
-- Extra reviews past 100 are not saved up.
--
-- Unchanged: the free ticket for a student's first review, and the bonus
-- ticket at every 10th rank (neither counts toward the daily cap).
-- reviews_counted keeps counting every review, for stats.
-- =====================================================================

-- 1. New columns
alter table public.user_gacha
  add column if not exists earned_tickets  int  not null default 0,   -- tickets earned from reviews
  add column if not exists ticket_progress int  not null default 0,   -- reviews toward the next one (0 to 100)
  add column if not exists last_ticket_on  date;                      -- Japan-time day of the last earned ticket

-- Keep everyone's existing tickets and progress.
update public.user_gacha
set earned_tickets  = floor(reviews_counted / 100)::int,
    ticket_progress = reviews_counted % 100
where earned_tickets = 0 and ticket_progress = 0 and reviews_counted > 0;


-- 2. Today's date in Japan
create or replace function public.gacha_today()
returns date
language sql stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Tokyo')::date
$$;


-- 3. Turn a full progress bar into a ticket, if today's ticket hasn't been earned yet.
create or replace function public.gacha_settle(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_per int := public.gacha_setting('reviews_per_ticket')::int;
begin
  update public.user_gacha g
  set earned_tickets  = g.earned_tickets + 1,
      ticket_progress = 0,
      last_ticket_on  = public.gacha_today(),
      updated_at      = now()
  where g.user_id = p_user
    and g.ticket_progress >= v_per
    and (g.last_ticket_on is null or g.last_ticket_on < public.gacha_today());
end;
$$;


-- 4. Tickets available now: free first ticket + earned + rank bonus - used
create or replace function public.gacha_tickets_available(p_user uuid)
returns int
language sql stable
security definer
set search_path = ''
as $$
  select greatest(0,
           (case when g.reviews_counted >= 1 then 1 else 0 end)
         + g.earned_tickets
         + (public.gacha_player_level(p_user) / 10)
         - g.tickets_spent)
  from public.user_gacha g
  where g.user_id = p_user
$$;


-- 5. gacha_ensure now also settles, so gacha_status and gacha_pull
--    always see a ticket that became due at midnight.
create or replace function public.gacha_ensure(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_gacha (user_id) values (p_user)
  on conflict (user_id) do nothing;

  insert into public.user_avatars (user_id, avatar_id)
  select p_user, a.id from public.avatars a where a.is_starter and a.active
  on conflict do nothing;

  update public.user_gacha g
  set equipped_avatar_id = (select a.id from public.avatars a
                            where a.is_starter and a.active
                            order by a.sort_order, a.id limit 1)
  where g.user_id = p_user and g.equipped_avatar_id is null;

  perform public.gacha_settle(p_user);
end;
$$;


-- 6. Review counting: same rules as before, plus progress (stops at 100) and settling.
create or replace function public.gacha_count_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last timestamptz;
  v_per int := public.gacha_setting('reviews_per_ticket')::int;
begin
  if old.next_review_at is null
     or old.next_review_at > now()
     or new.next_review_at is not distinct from old.next_review_at then
    return new;
  end if;

  select c.last_counted_at into v_last
  from public.counted_cards c
  where c.user_id = new.user_id and c.word_id = new.word_id and c.direction = new.direction;

  if v_last is not null then
    if old.level = 0 then
      return new;
    end if;
    if v_last > now() - make_interval(hours => public.gacha_setting('review_cooldown_hours')::int) then
      return new;
    end if;
  end if;

  insert into public.counted_cards (user_id, word_id, direction, last_counted_at)
  values (new.user_id, new.word_id, new.direction, now())
  on conflict (user_id, word_id, direction) do update set last_counted_at = excluded.last_counted_at;

  insert into public.user_gacha (user_id, reviews_counted, ticket_progress) values (new.user_id, 1, 1)
  on conflict (user_id) do update
    set reviews_counted = public.user_gacha.reviews_counted + 1,
        ticket_progress = least(v_per, public.user_gacha.ticket_progress + 1),
        updated_at = now();

  perform public.gacha_settle(new.user_id);

  return new;
end;
$$;


-- 7. gacha_status: progress comes from ticket_progress, plus a flag for
--    "today's ticket is done, the next one comes tomorrow".
create or replace function public.gacha_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_g public.user_gacha;
  v_total_weight numeric;
  v_odds jsonb;
  v_remaining_total int;
  v_avatar jsonb;
  v_per int := public.gacha_setting('reviews_per_ticket')::int;
begin
  if v_user is null then raise exception 'not_signed_in'; end if;
  perform public.gacha_ensure(v_user);
  select * into v_g from public.user_gacha where user_id = v_user;

  select coalesce(sum(public.gacha_setting('weight_' || r.rarity)), 0), coalesce(sum(r.remaining), 0)
  into v_total_weight, v_remaining_total
  from public.gacha_remaining(v_user) r;

  select coalesce(jsonb_object_agg(k.rarity,
           case when v_total_weight = 0 or coalesce(r.remaining, 0) = 0 then 0
                else round(100 * public.gacha_setting('weight_' || k.rarity) / v_total_weight, 1) end), '{}'::jsonb)
  into v_odds
  from (values ('normal'), ('rare'), ('super_rare'), ('secret')) k(rarity)
  left join public.gacha_remaining(v_user) r on r.rarity = k.rarity;

  select jsonb_build_object('id', a.id, 'slug', a.slug, 'name_ja', a.name_ja, 'name_en', a.name_en,
                            'rarity', a.rarity, 'image_url', a.image_url)
  into v_avatar
  from public.avatars a where a.id = v_g.equipped_avatar_id;

  return jsonb_build_object(
    'tickets', public.gacha_tickets_available(v_user),
    'reviews_counted', v_g.reviews_counted,
    'reviews_to_next_ticket', greatest(0, v_per - v_g.ticket_progress),
    'reviews_per_ticket', v_per,
    'next_ticket_tomorrow', v_g.ticket_progress >= v_per,          -- today's ticket already earned
    'earned_ticket_today', v_g.last_ticket_on = public.gacha_today(),
    'remaining', v_remaining_total,
    'owned', (select count(*) from public.user_avatars ua
              join public.avatars a on a.id = ua.avatar_id
              where ua.user_id = v_user and a.active),
    'total', (select count(*) from public.avatars a where a.active),
    'odds', v_odds,
    'player_level', public.gacha_player_level(v_user),
    'equipped_avatar', v_avatar,
    'theme', v_g.theme
  );
end;
$$;


-- 8. Helpers stay internal (students can't call them directly).
revoke execute on function public.gacha_today(), public.gacha_settle(uuid)
  from public, anon, authenticated;
