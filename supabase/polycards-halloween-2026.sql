-- =====================================================================
-- Polyvo: Halloween 2026 event Polyavatars (2026-11-01)
-- Run once in the Supabase SQL editor, AFTER polycards-rankup-special.sql.
-- Safe to run twice. The event starts the moment this file is run.
--
-- 1. Six new ordinary gacha Polyavatars, series 'Halloween 2026'
--    (pictures in public/avatars/halloween-*.svg). Never starters, never Special.
-- 2. gacha_event_setting(): the event's series, end time and boost share.
--    Change the end date or the 50% by re-running ONLY that function.
-- 3. The boost: while the event is on and the student still lacks at least
--    one Halloween Polyavatar, each pull first picks the Halloween set with
--    the boost share (50%), otherwise everything else; inside each part the
--    usual rarity weights. Every old rule stays: never a duplicate, the row
--    lock, the hidden Secret guarantee (checked first; Halloween has no
--    Secret), Specials never in the pool. After the event ends the set is
--    simply part of the normal pool (no boost).
-- 4. gacha_status() returns odds that include the boost, plus
--    event: { series, ends_at, active, share, owned, total }.
-- gacha_pull(), gacha_remaining() and gacha_status() were rebuilt from the
-- LIVE definitions (pg_get_functiondef, 2026-11-01) plus only the event parts.
-- Check afterwards with supabase/check-halloween-2026.sql.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. The six Halloween 2026 Polyavatars
-- ---------------------------------------------------------------------
insert into public.avatars (slug, name_ja, name_en, rarity, series, image_url, is_starter, active, sort_order) values
  ('halloween-pumpkin-jack', 'パンプキン・ジャック', 'Pumpkin Jack',     'super_rare', 'Halloween 2026', '/avatars/halloween-pumpkin-jack.svg', false, true, 51),
  ('halloween-skeleton',     'スケルトン',           'Skeleton',         'rare',       'Halloween 2026', '/avatars/halloween-skeleton.svg',     false, true, 52),
  ('halloween-ghost',        'おばけ',               'Ghost',            'rare',       'Halloween 2026', '/avatars/halloween-ghost.svg',        false, true, 53),
  ('halloween-black-cat',    '黒ねこ',               'Black Cat',        'normal',     'Halloween 2026', '/avatars/halloween-black-cat.svg',    false, true, 54),
  ('halloween-bat',          'コウモリ',             'Bat',              'normal',     'Halloween 2026', '/avatars/halloween-bat.svg',          false, true, 55),
  ('halloween-cauldron',     'まじょの大なべ',       'Witch''s Cauldron', 'normal',    'Halloween 2026', '/avatars/halloween-cauldron.svg',     false, true, 56)
on conflict (slug) do nothing;


-- ---------------------------------------------------------------------
-- 2. Event settings (the only place to change the date or the share)
-- ---------------------------------------------------------------------
-- series:  avatars.series of the event set
-- ends_at: last moment of the event (Japan time, +09)
-- share:   chance (0–1) that a pull comes from the event set while it's on
create or replace function public.gacha_event_setting()
returns table (series text, ends_at timestamptz, share numeric)
language sql
stable
set search_path = ''
as $$
  select 'Halloween 2026'::text,
         timestamptz '2026-11-08 23:59:59+09',
         0.5::numeric
$$;


-- ---------------------------------------------------------------------
-- 3. Internal helpers
-- ---------------------------------------------------------------------
-- What the student can still get, split into the event set and the rest
-- (same filter as gacha_remaining()).
create or replace function public.gacha_remaining_split(p_user uuid)
returns table (rarity text, remaining int, in_event boolean)
language sql
stable security definer
set search_path = ''
as $$
  select a.rarity, count(*)::int,
         a.series is not distinct from (select e.series from public.gacha_event_setting() e)
  from public.avatars a
  where a.active and not a.is_starter and a.rarity <> 'special'
    and not exists (select 1 from public.user_avatars ua
                    where ua.user_id = p_user and ua.avatar_id = a.id)
  group by 1, 3
$$;

-- True while the event is on AND the student still lacks an event avatar AND
-- still lacks something outside the event (if only event avatars are left,
-- an ordinary pull gives them anyway).
create or replace function public.gacha_event_boost_on(p_user uuid)
returns boolean
language sql
stable security definer
set search_path = ''
as $$
  select coalesce((select now() <= e.ends_at from public.gacha_event_setting() e), false)
     and exists (select 1 from public.gacha_remaining_split(p_user) s where s.in_event)
     and exists (select 1 from public.gacha_remaining_split(p_user) s where not s.in_event)
$$;

-- The odds shown on the gacha screen (percent, 1 decimal):
-- { odds: { normal, rare, super_rare, secret }, event_share }.
-- Boost on:  odds_r = share · w_r / W_event + (1 − share) · w_r / W_other
-- Boost off: odds_r = w_r / W_all (as before), event_share 0.
create or replace function public.gacha_odds(p_user uuid)
returns jsonb
language plpgsql
stable security definer
set search_path = ''
as $$
declare
  v_boost boolean := public.gacha_event_boost_on(p_user);
  v_share numeric := 0;
  v_w_all numeric;
  v_w_event numeric;
  v_w_other numeric;
  v_odds jsonb;
begin
  if v_boost then
    select e.share into v_share from public.gacha_event_setting() e;
  end if;

  select coalesce(sum(public.gacha_setting('weight_' || s.rarity)), 0),
         coalesce(sum(public.gacha_setting('weight_' || s.rarity)) filter (where s.in_event), 0),
         coalesce(sum(public.gacha_setting('weight_' || s.rarity)) filter (where not s.in_event), 0)
  into v_w_all, v_w_event, v_w_other
  from (select distinct x.rarity, x.in_event from public.gacha_remaining_split(p_user) x) s;

  select coalesce(jsonb_object_agg(k.rarity, round(100 * (
           case
             when v_boost then
                 (case when v_w_event > 0 and exists (select 1 from public.gacha_remaining_split(p_user) s
                                                      where s.rarity = k.rarity and s.in_event)
                       then v_share * public.gacha_setting('weight_' || k.rarity) / v_w_event else 0 end)
               + (case when v_w_other > 0 and exists (select 1 from public.gacha_remaining_split(p_user) s
                                                      where s.rarity = k.rarity and not s.in_event)
                       then (1 - v_share) * public.gacha_setting('weight_' || k.rarity) / v_w_other else 0 end)
             when v_w_all > 0 and exists (select 1 from public.gacha_remaining_split(p_user) s where s.rarity = k.rarity)
               then public.gacha_setting('weight_' || k.rarity) / v_w_all
             else 0
           end), 1)), '{}'::jsonb)
  into v_odds
  from (values ('normal'), ('rare'), ('super_rare'), ('secret')) k(rarity);

  return jsonb_build_object('odds', v_odds, 'event_share', round(100 * v_share, 1));
end;
$$;

revoke all on function public.gacha_event_setting() from public, anon, authenticated;
revoke all on function public.gacha_remaining_split(uuid) from public, anon, authenticated;
revoke all on function public.gacha_event_boost_on(uuid) from public, anon, authenticated;
revoke all on function public.gacha_odds(uuid) from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 4. gacha_remaining(): unchanged (live definition, restated so this file
--    stands alone). Still the list for 'remaining' and collection_complete.
-- ---------------------------------------------------------------------
create or replace function public.gacha_remaining(p_user uuid)
returns table (rarity text, remaining int)
language sql
stable security definer
set search_path = ''
as $$
  select a.rarity, count(*)::int
  from public.avatars a
  where a.active and not a.is_starter and a.rarity <> 'special'
    and not exists (select 1 from public.user_avatars ua
                    where ua.user_id = p_user and ua.avatar_id = a.id)
  group by a.rarity
$$;


-- ---------------------------------------------------------------------
-- 5. gacha_pull(): live definition + the event boost
-- ---------------------------------------------------------------------
create or replace function public.gacha_pull()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_g public.user_gacha;
  v_rarity text;
  v_total numeric;
  v_roll numeric;
  v_secret_left int;
  r record;
  v_avatar public.avatars;
  v_event_series text;
  v_pool boolean := null;   -- null = whole pool, true = event set only, false = everything but the event set
begin
  if v_user is null then raise exception 'not_signed_in'; end if;
  perform public.gacha_ensure(v_user);

  -- Lock the student's row so two quick taps can't spend the same ticket twice.
  select * into v_g from public.user_gacha where user_id = v_user for update;

  if public.gacha_tickets_available(v_user) < 1 then
    raise exception 'no_tickets';
  end if;

  select coalesce(sum(public.gacha_setting('weight_' || g.rarity)), 0)
  into v_total from public.gacha_remaining(v_user) g;
  if v_total = 0 then
    raise exception 'collection_complete';
  end if;

  select coalesce(sum(g.remaining), 0) into v_secret_left
  from public.gacha_remaining(v_user) g where g.rarity = 'secret';

  select e.series into v_event_series from public.gacha_event_setting() e;

  if v_secret_left > 0 and v_g.pulls_since_secret >= public.gacha_setting('pity_pulls') then
    v_rarity := 'secret';                       -- hidden guarantee (comes before the event boost)
  else
    -- Event boost: first choose the part of the pool, then the rarity inside it.
    if public.gacha_event_boost_on(v_user) then
      v_pool := random() < (select e.share from public.gacha_event_setting() e);
    end if;

    select coalesce(sum(public.gacha_setting('weight_' || s.rarity)), 0)
    into v_total
    from (select distinct x.rarity from public.gacha_remaining_split(v_user) x
          where v_pool is null or x.in_event = v_pool) s;

    v_roll := random() * v_total;
    for r in
      select s.rarity, public.gacha_setting('weight_' || s.rarity) as w
      from (select distinct x.rarity from public.gacha_remaining_split(v_user) x
            where v_pool is null or x.in_event = v_pool) s
      order by array_position(array['normal', 'rare', 'super_rare', 'secret'], s.rarity)
    loop
      v_rarity := r.rarity;
      v_roll := v_roll - r.w;
      exit when v_roll < 0;
    end loop;
  end if;

  select a.* into v_avatar
  from public.avatars a
  where a.active and not a.is_starter and a.rarity = v_rarity and a.rarity <> 'special'
    and (v_pool is null or (a.series is not distinct from v_event_series) = v_pool)
    and not exists (select 1 from public.user_avatars ua
                    where ua.user_id = v_user and ua.avatar_id = a.id)
  order by random()
  limit 1;

  insert into public.user_avatars (user_id, avatar_id) values (v_user, v_avatar.id);

  update public.user_gacha
  set tickets_spent = tickets_spent + 1,
      pulls_since_secret = case when v_rarity = 'secret' then 0 else pulls_since_secret + 1 end,
      updated_at = now()
  where user_id = v_user;

  return jsonb_build_object(
    'avatar', jsonb_build_object('id', v_avatar.id, 'slug', v_avatar.slug,
                                 'name_ja', v_avatar.name_ja, 'name_en', v_avatar.name_en,
                                 'rarity', v_avatar.rarity, 'series', v_avatar.series,
                                 'image_url', v_avatar.image_url),
    'tickets_left', public.gacha_tickets_available(v_user)
  );
end;
$$;


-- ---------------------------------------------------------------------
-- 6. gacha_status(): live definition, odds from gacha_odds() + event
-- ---------------------------------------------------------------------
create or replace function public.gacha_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_g public.user_gacha;
  v_odds jsonb;
  v_remaining_total int;
  v_avatar jsonb;
  v_per int := public.gacha_setting('reviews_per_ticket')::int;
  v_spell_per int := public.gacha_setting('spelling_points_per_ticket')::int;
  v_spell int;
  v_event jsonb;
begin
  if v_user is null then raise exception 'not_signed_in'; end if;
  perform public.gacha_ensure(v_user);
  select * into v_g from public.user_gacha where user_id = v_user;
  v_spell := public.gacha_spelling_points(v_user);

  select coalesce(sum(r.remaining), 0) into v_remaining_total
  from public.gacha_remaining(v_user) r;

  v_odds := public.gacha_odds(v_user);

  -- null when the event set has no active avatars
  select case when count(a.id) > 0 then jsonb_build_object(
           'series', e.series,
           'ends_at', e.ends_at,
           'active', now() <= e.ends_at,
           'share', v_odds->'event_share',
           'owned', count(ua.avatar_id),
           'total', count(a.id)) end
  into v_event
  from public.gacha_event_setting() e
  left join public.avatars a on a.series = e.series and a.active
  left join public.user_avatars ua on ua.avatar_id = a.id and ua.user_id = v_user
  group by e.series, e.ends_at;

  select jsonb_build_object('id', a.id, 'slug', a.slug, 'name_ja', a.name_ja, 'name_en', a.name_en,
                            'rarity', a.rarity, 'image_url', a.image_url)
  into v_avatar
  from public.avatars a where a.id = v_g.equipped_avatar_id;

  return jsonb_build_object(
    'tickets', public.gacha_tickets_available(v_user),
    'reviews_counted', v_g.reviews_counted,
    'reviews_to_next_ticket', greatest(0, v_per - v_g.ticket_progress),
    'reviews_per_ticket', v_per,
    'next_ticket_tomorrow', v_g.ticket_progress >= v_per,          -- today's review ticket already earned
    'earned_ticket_today', v_g.last_ticket_on = public.gacha_today(),
    'spelling_points', v_spell,
    'spelling_points_per_ticket', v_spell_per,
    'spelling_to_next_ticket', v_spell_per - (v_spell % v_spell_per),  -- 1 to 150
    'remaining', v_remaining_total,
    'owned', (select count(*) from public.user_avatars ua
              join public.avatars a on a.id = ua.avatar_id
              where ua.user_id = v_user and a.active),
    'total', (select count(*) from public.avatars a where a.active),
    'odds', v_odds->'odds',
    'event', v_event,
    'player_level', public.gacha_player_level(v_user),
    'equipped_avatar', v_avatar,
    'theme', v_g.theme
  );
end;
$$;


-- ---------------------------------------------------------------------
-- Snippets (run one at a time when needed)
-- ---------------------------------------------------------------------
-- A. Who has which Halloween Polyavatar:
--   select u.email, u.raw_user_meta_data->>'username' as username, a.name_en, ua.obtained_at
--   from public.user_avatars ua
--   join public.avatars a on a.id = ua.avatar_id and a.series = 'Halloween 2026'
--   join auth.users u on u.id = ua.user_id
--   order by ua.obtained_at;
--
-- B. Move the end date or change the share: re-run section 2 with new values,
--    e.g. timestamptz '2026-11-15 23:59:59+09' or 0.3::numeric.
