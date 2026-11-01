-- =====================================================================
-- Polyvo: hide how many Secret Polyavatars exist (2026-11-01)
-- =====================================================================
-- Run in the Supabase SQL editor, after polycards-halloween-2026.sql.
-- Safe to run before or after the app code is deployed (the app also turns
-- several missing-Secret rows into one ??? on its own) and safe to run twice.
--
-- Before this file, a student could count the Secrets:
--   * gacha_collection() sent one row (with its id) per Secret not owned yet;
--   * gacha_status() sent total = every active avatar, and remaining = every
--     avatar not owned yet, Secrets included.
--
-- Rule from now on: total = active non-Secret avatars + the Secrets THIS
-- student owns. A missing Secret never counts, never sends an id.
--
-- Both functions are rebuilt from the live definitions (checked with
-- pg_get_functiondef on 2026-11-01); only the lines marked "CHANGED" differ.
-- Nothing else changes: odds (percent by rarity weight, not by count),
-- gacha_pull(), the pity, the event boost.
--
-- Check afterwards: supabase/check-secret-count.sql (every row PASS).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. gacha_collection(): one ??? placeholder per series instead of a row per
--    missing Secret. Same columns as before, so no drop is needed.
--    Placeholder: id null, rarity 'secret', the series, owned false, every
--    name / slug / picture / date / sort_order null, equipped false.
-- ---------------------------------------------------------------------
create or replace function public.gacha_collection()
returns table (
  id bigint, slug text, rarity text, series text, sort_order int,
  owned boolean, obtained_at timestamptz, equipped boolean,
  name_ja text, name_en text, image_url text, unlock_rank int
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not_signed_in'; end if;
  perform public.gacha_ensure(v_user);

  return query
  select c.id, c.slug, c.rarity, c.series, c.sort_order, c.owned, c.obtained_at, c.equipped,
         c.name_ja, c.name_en, c.image_url, c.unlock_rank
  from (
    -- Every active avatar the student owns, and every active non-Secret one (as before)
    select a.id,
           case when ua.avatar_id is not null then a.slug end as slug,
           a.rarity, a.series, a.sort_order,
           ua.avatar_id is not null as owned,
           ua.obtained_at,
           a.id = g.equipped_avatar_id as equipped,
           case when ua.avatar_id is not null then a.name_ja end as name_ja,
           case when ua.avatar_id is not null then a.name_en end as name_en,
           a.image_url,
           a.unlock_rank
    from public.avatars a
    left join public.user_avatars ua on ua.avatar_id = a.id and ua.user_id = v_user
    left join public.user_gacha g on g.user_id = v_user
    where a.active
      and (a.rarity <> 'secret' or ua.avatar_id is not null)             -- CHANGED

    union all

    -- CHANGED: one locked placeholder per series that still has a missing Secret
    select null::bigint, null::text, 'secret'::text, a.series, null::int,
           false, null::timestamptz, false,
           null::text, null::text, null::text, null::int
    from public.avatars a
    where a.active and a.rarity = 'secret'
      and not exists (select 1 from public.user_avatars ua
                      where ua.user_id = v_user and ua.avatar_id = a.id)
    group by a.series
  ) c
  order by c.series,
           array_position(array['normal', 'rare', 'super_rare', 'secret', 'special'], c.rarity),
           c.sort_order nulls last, c.id nulls last;
end;
$$;
revoke execute on function public.gacha_collection() from public, anon;
grant execute on function public.gacha_collection() to authenticated;


-- ---------------------------------------------------------------------
-- 2. gacha_status(): total, remaining and event.total leave out missing
--    Secrets. remaining = non-Secrets still missing + 1 if any Secret is
--    missing (the app doesn't show it, but the number would give it away).
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

  -- CHANGED: missing Secrets count as 1 at most
  select coalesce(sum(r.remaining) filter (where r.rarity <> 'secret'), 0)
         + case when coalesce(sum(r.remaining) filter (where r.rarity = 'secret'), 0) > 0 then 1 else 0 end
  into v_remaining_total
  from public.gacha_remaining(v_user) r;

  v_odds := public.gacha_odds(v_user);

  -- null when the event set has no active avatars
  select case when count(a.id) > 0 then jsonb_build_object(
           'series', e.series,
           'ends_at', e.ends_at,
           'active', now() <= e.ends_at,
           'share', v_odds->'event_share',
           'owned', count(ua.avatar_id),
           'total', count(a.id) filter (where a.rarity <> 'secret' or ua.avatar_id is not null))  -- CHANGED
         end
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
    -- CHANGED: active non-Secrets + the Secrets this student owns
    'total', (select count(*) from public.avatars a
              where a.active
                and (a.rarity <> 'secret'
                     or exists (select 1 from public.user_avatars ua
                                where ua.user_id = v_user and ua.avatar_id = a.id))),
    'odds', v_odds->'odds',
    'event', v_event,
    'player_level', public.gacha_player_level(v_user),
    'equipped_avatar', v_avatar,
    'theme', v_g.theme
  );
end;
$$;
