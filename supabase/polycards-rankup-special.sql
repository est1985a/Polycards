-- =====================================================================
-- Polyvo: rank-up pop-up + Special Polyavatars (2026-11-01)
-- Run once in the Supabase SQL editor, after polycards-rank-curve-10.sql,
-- polycards-seen-theme-unlocks.sql and polycards-avatar-obtained-at.sql.
-- It can be run BEFORE the app code is deployed: the old app ignores the new
-- column, functions and avatars (the live 図鑑 just shows five more locked
-- tiles), and the new app shows no rank-up pop-up until this has been run.
-- Safe to run twice.
--
-- 1. user_gacha.last_seen_rank: the rank whose pop-up the student has seen.
--    Existing accounts are set to their rank now, so nobody gets a pop-up
--    for old progress.
-- 2. rank_rewards() / mark_rank_seen(rank): what the app calls.
-- 3. Rarity 'special' + avatars.unlock_rank, and the five Special
--    Polyavatars (Polyvo logo Bronze 80, Silver 90, Gold 100, Platinum 110,
--    Diamond 120). image_url is NULL = the app draws a placeholder; set it
--    later when the final art is uploaded.
-- 4. Specials are never in the gacha: gacha_remaining() and gacha_pull()
--    leave them out (both rebuilt from the live definitions, 2026-11-01).
-- 5. Specials are given by the database when the rank is reached: triggers
--    on user_stats (peak) and user_study_totals (spelling bonus), plus
--    gacha_ensure() as a catch-all. obtained_at = the moment it was given
--    (the backfill below uses the time this file is run).
-- 6. gacha_collection() also returns unlock_rank.
-- Check afterwards with supabase/check-special-avatars.sql.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. last_seen_rank
-- ---------------------------------------------------------------------
alter table public.user_gacha
  add column if not exists last_seen_rank int not null default 1;

-- Backfill: every account counts as having seen its rank now (no pop-up for
-- old progress). Only raises, so running the file again changes nothing.
insert into public.user_gacha (user_id, last_seen_rank)
select u.id, public.gacha_player_level(u.id)
from auth.users u
on conflict (user_id) do update
  set last_seen_rank = greatest(public.user_gacha.last_seen_rank, excluded.last_seen_rank);


-- ---------------------------------------------------------------------
-- 2. Rarity 'special' and the five Special Polyavatars
-- ---------------------------------------------------------------------
alter table public.avatars drop constraint if exists avatars_rarity_check;
alter table public.avatars add constraint avatars_rarity_check
  check (rarity in ('normal', 'rare', 'super_rare', 'secret', 'special'));

-- The rank that gives this avatar (Specials only; NULL for everything else).
alter table public.avatars add column if not exists unlock_rank int;

insert into public.avatars (slug, name_ja, name_en, rarity, series, is_starter, active, sort_order, unlock_rank) values
  ('special-bronze',   'ポリボ ブロンズ',   'Polyvo Bronze',   'special', 'Special', false, true, 1, 80),
  ('special-silver',   'ポリボ シルバー',   'Polyvo Silver',   'special', 'Special', false, true, 2, 90),
  ('special-gold',     'ポリボ ゴールド',   'Polyvo Gold',     'special', 'Special', false, true, 3, 100),
  ('special-platinum', 'ポリボ プラチナ',   'Polyvo Platinum', 'special', 'Special', false, true, 4, 110),
  ('special-diamond',  'ポリボ ダイヤモンド', 'Polyvo Diamond',  'special', 'Special', false, true, 5, 120)
on conflict (slug) do nothing;


-- ---------------------------------------------------------------------
-- 3. Never in the gacha
-- ---------------------------------------------------------------------
-- Live definition + "a.rarity <> 'special'". This list drives the weights,
-- the odds, 'remaining' and collection_complete, so Specials can't be drawn.
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

-- Live definition + the same filter on the final pick (belt and braces).
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

  if v_secret_left > 0 and v_g.pulls_since_secret >= public.gacha_setting('pity_pulls') then
    v_rarity := 'secret';                       -- hidden guarantee
  else
    v_roll := random() * v_total;
    for r in
      select g.rarity, public.gacha_setting('weight_' || g.rarity) as w
      from public.gacha_remaining(v_user) g
      order by array_position(array['normal', 'rare', 'super_rare', 'secret'], g.rarity)
    loop
      v_rarity := r.rarity;
      v_roll := v_roll - r.w;
      exit when v_roll < 0;
    end loop;
  end if;

  select a.* into v_avatar
  from public.avatars a
  where a.active and not a.is_starter and a.rarity = v_rarity and a.rarity <> 'special'
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
-- 4. Giving Specials when the rank is reached
-- ---------------------------------------------------------------------
-- Internal: gives every active Special whose unlock_rank the student has
-- reached and doesn't own yet. obtained_at = now() (the unlock date).
create or replace function public.grant_special_avatars(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.user_avatars (user_id, avatar_id)
  select p_user, a.id
  from public.avatars a
  where a.active and a.rarity = 'special' and a.unlock_rank is not null
    and a.unlock_rank <= public.gacha_player_level(p_user)
  on conflict do nothing
$$;

-- Trigger function for user_stats (peak) and user_study_totals (spelling
-- bonus): the two numbers the rank comes from. A failure here must never
-- stop record_answer, so any error only becomes a warning (gacha_ensure()
-- gives the avatar later anyway).
create or replace function public.grant_special_avatars_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform public.grant_special_avatars(new.user_id);
  exception when others then
    raise warning 'grant_special_avatars failed for %: %', new.user_id, sqlerrm;
  end;
  return null;
end;
$$;

drop trigger if exists user_stats_grant_specials on public.user_stats;
create trigger user_stats_grant_specials
  after insert or update of peak_points on public.user_stats
  for each row execute function public.grant_special_avatars_trigger();

drop trigger if exists user_study_totals_grant_specials on public.user_study_totals;
create trigger user_study_totals_grant_specials
  after insert or update of bonus_points on public.user_study_totals
  for each row execute function public.grant_special_avatars_trigger();

-- gacha_ensure(): live definition + the catch-all grant (runs whenever the
-- gacha status, the collection or the rank rewards load).
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
  perform public.grant_special_avatars(p_user);
end;
$$;

revoke all on function public.grant_special_avatars(uuid) from public, anon, authenticated;
revoke all on function public.grant_special_avatars_trigger() from public, anon, authenticated;

-- Backfill: anyone already at Rank 80+ gets their Specials now.
select public.grant_special_avatars(u.id) from auth.users u;


-- ---------------------------------------------------------------------
-- 5. The collection, with unlock_rank (the return type changes, so drop first)
-- ---------------------------------------------------------------------
drop function if exists public.gacha_collection();
create function public.gacha_collection()
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
  select a.id,
         case when ua.avatar_id is not null then a.slug end,
         a.rarity, a.series, a.sort_order,
         ua.avatar_id is not null,
         ua.obtained_at,
         a.id = g.equipped_avatar_id,
         case when ua.avatar_id is not null then a.name_ja end,
         case when ua.avatar_id is not null then a.name_en end,
         case when ua.avatar_id is not null or a.rarity <> 'secret' then a.image_url end,
         a.unlock_rank
  from public.avatars a
  left join public.user_avatars ua on ua.avatar_id = a.id and ua.user_id = v_user
  left join public.user_gacha g on g.user_id = v_user
  where a.active
  order by a.series,
           array_position(array['normal', 'rare', 'super_rare', 'secret', 'special'], a.rarity),
           a.sort_order, a.id;
end;
$$;
revoke execute on function public.gacha_collection() from public, anon;
grant execute on function public.gacha_collection() to authenticated;


-- ---------------------------------------------------------------------
-- 6. What the app calls for the rank-up pop-up
-- ---------------------------------------------------------------------
-- { last_seen_rank, rank, specials: [{ id, slug, name_ja, name_en, rarity,
--   image_url, unlock_rank, owned, obtained_at }] }
-- rank = gacha_player_level(): the app uses THIS rank for the pop-up (never
-- its own copy), so the pop-up can't repeat if the two ever differ.
create or replace function public.rank_rewards()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not_signed_in'; end if;
  perform public.gacha_ensure(v_user);
  return jsonb_build_object(
    'last_seen_rank', (select g.last_seen_rank from public.user_gacha g where g.user_id = v_user),
    'rank', public.gacha_player_level(v_user),
    'specials', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', a.id, 'slug', a.slug, 'name_ja', a.name_ja, 'name_en', a.name_en,
               'rarity', a.rarity, 'image_url', a.image_url, 'unlock_rank', a.unlock_rank,
               'owned', ua.avatar_id is not null, 'obtained_at', ua.obtained_at)
             order by a.unlock_rank, a.id)
      from public.avatars a
      left join public.user_avatars ua on ua.avatar_id = a.id and ua.user_id = v_user
      where a.active and a.rarity = 'special' and a.unlock_rank is not null), '[]'::jsonb)
  );
end;
$$;

-- Saves that the pop-up for this rank was shown. Never above the real rank,
-- never lower than what was saved. Returns the saved value.
create or replace function public.mark_rank_seen(p_rank int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_seen int;
begin
  if v_user is null then raise exception 'not_signed_in'; end if;
  perform public.gacha_ensure(v_user);
  update public.user_gacha g
  set last_seen_rank = greatest(g.last_seen_rank,
                                least(coalesce(p_rank, 0), public.gacha_player_level(v_user))),
      updated_at = now()
  where g.user_id = v_user
  returning g.last_seen_rank into v_seen;
  return v_seen;
end;
$$;

revoke execute on function public.rank_rewards(), public.mark_rank_seen(int)
  from public, anon, authenticated;
grant execute on function public.rank_rewards(), public.mark_rank_seen(int)
  to authenticated;


-- ---------------------------------------------------------------------
-- Snippets (run one at a time when needed)
-- ---------------------------------------------------------------------
-- A. Who has which Special, and when:
--   select u.email, a.name_en, ua.obtained_at
--   from public.user_avatars ua
--   join public.avatars a on a.id = ua.avatar_id and a.rarity = 'special'
--   join auth.users u on u.id = ua.user_id
--   order by a.unlock_rank, ua.obtained_at;
--
-- B. The final art is ready (one line per avatar):
--   update public.avatars set image_url = 'https://…/special-bronze.png' where slug = 'special-bronze';
