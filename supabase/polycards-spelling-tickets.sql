-- =====================================================================
-- Polycards: spelling tickets (2026-10-24)
-- Run once in the Supabase SQL editor, after polycards-ticket-daily-cap.sql.
--
-- Rule: every 150 spelling points (スペルボーナス) = 1 ガチャ券.
-- Counted from the all-time total in user_study_totals.bonus_points,
-- so students who already have points get their tickets straight away.
-- Spelling tickets are NOT part of the 1-a-day review cap (like the
-- free first ticket and the every-10th-rank bonus).
--
-- Changes: one new setting, the ticket total, and two new fields in
-- gacha_status (spelling_points, spelling_to_next_ticket,
-- spelling_points_per_ticket). Nothing else changes.
-- Safe to run more than once.
-- =====================================================================

-- 1. Settings (same as before + spelling_points_per_ticket)
create or replace function public.gacha_setting(p_key text)
returns numeric
language sql immutable
set search_path = ''
as $$
  select case p_key
    when 'reviews_per_ticket' then 100
    when 'spelling_points_per_ticket' then 150   -- spelling bonus points per ticket
    when 'pity_pulls'         then 50     -- hidden: after this many pulls without a Secret, the next is a Secret
    when 'weight_normal'      then 69
    when 'weight_rare'        then 25
    when 'weight_super_rare'  then 5
    when 'weight_secret'      then 1
    when 'review_cooldown_hours' then 3   -- the same card can't count twice within this time
  end
$$;


-- 2. Spelling points for one student (0 if they have none yet)
create or replace function public.gacha_spelling_points(p_user uuid)
returns int
language sql stable
security definer
set search_path = ''
as $$
  select coalesce((select t.bonus_points from public.user_study_totals t where t.user_id = p_user), 0)
$$;


-- 3. Tickets available now:
--    free first ticket + review tickets + spelling tickets + rank bonus - used
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
         - g.tickets_spent)
  from public.user_gacha g
  where g.user_id = p_user
$$;


-- 4. gacha_status: same as before + spelling ticket progress
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
  v_spell_per int := public.gacha_setting('spelling_points_per_ticket')::int;
  v_spell int;
begin
  if v_user is null then raise exception 'not_signed_in'; end if;
  perform public.gacha_ensure(v_user);
  select * into v_g from public.user_gacha where user_id = v_user;
  v_spell := public.gacha_spelling_points(v_user);

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
    'odds', v_odds,
    'player_level', public.gacha_player_level(v_user),
    'equipped_avatar', v_avatar,
    'theme', v_g.theme
  );
end;
$$;


-- 5. The new helper stays internal (students can't call it directly).
revoke execute on function public.gacha_spelling_points(uuid) from public, anon, authenticated;


-- 6. Check: spelling points and tickets for every account.
select u.email,
       public.gacha_spelling_points(g.user_id)                       as spelling_points,
       floor(public.gacha_spelling_points(g.user_id) / 150)::int     as spelling_tickets,
       public.gacha_tickets_available(g.user_id)                     as tickets_now
from public.user_gacha g
join auth.users u on u.id = g.user_id
order by spelling_points desc;
