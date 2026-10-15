-- =====================================================================
-- Polycards: gacha (avatars, tickets, themes)
-- Run once in the Supabase SQL editor. Safe to run on the live database:
-- it only ADDS new tables and functions, and one trigger on user_cards
-- that counts reviews. Nothing existing is changed or deleted.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Avatars (the library of everything that can be pulled)
-- ---------------------------------------------------------------------
create table public.avatars (
  id          bigint generated always as identity primary key,
  slug        text not null unique,              -- short code, e.g. 'fox'
  name_ja     text not null,
  name_en     text not null,
  rarity      text not null check (rarity in ('normal', 'rare', 'super_rare', 'secret')),
  series      text not null default 'Series 1',
  image_url   text,                              -- NULL = the app shows a placeholder picture
  is_starter  boolean not null default false,    -- everyone owns it from day one (not in the gacha)
  active      boolean not null default true,     -- false = retired: can't be pulled, hidden from the collection
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
-- Students never read this table directly (Secret names must stay hidden),
-- only through the functions below. RLS on with no policies = no direct access.
alter table public.avatars enable row level security;

-- Who owns which avatar.
create table public.user_avatars (
  user_id     uuid not null references auth.users(id) on delete cascade,
  avatar_id   bigint not null references public.avatars(id),
  obtained_at timestamptz not null default now(),
  primary key (user_id, avatar_id)
);
alter table public.user_avatars enable row level security;
create policy "Read own avatars" on public.user_avatars
  for select to authenticated using (user_id = auth.uid());

-- One row per student: review count, tickets used, chosen avatar and theme.
-- Students can read their row but only the functions below can change it.
create table public.user_gacha (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  reviews_counted    int not null default 0,
  tickets_spent      int not null default 0,
  pulls_since_secret int not null default 0,
  equipped_avatar_id bigint references public.avatars(id),
  theme              text not null default 'midnight',
  updated_at         timestamptz not null default now()
);
alter table public.user_gacha enable row level security;
create policy "Read own gacha row" on public.user_gacha
  for select to authenticated using (user_id = auth.uid());

-- Which cards have been counted as a review, and when. Kept apart from
-- user_cards so removing and re-adding a deck can't count the same cards again.
create table public.counted_cards (
  user_id         uuid not null references auth.users(id) on delete cascade,
  word_id         bigint not null,
  direction       text not null,
  last_counted_at timestamptz not null default now(),
  primary key (user_id, word_id, direction)
);
alter table public.counted_cards enable row level security;   -- no policies: functions only

-- Theme unlocks by player level. theme_key must match a key in src/themes.js.
create table public.theme_unlocks (
  theme_key    text primary key,
  unlock_level int not null
);
alter table public.theme_unlocks enable row level security;
create policy "Anyone signed in can read theme unlocks" on public.theme_unlocks
  for select to authenticated using (true);

-- Belt and braces: students may only SELECT from these tables.
revoke insert, update, delete, truncate, references, trigger
  on public.avatars, public.user_avatars, public.user_gacha, public.counted_cards, public.theme_unlocks
  from anon, authenticated;
revoke select on public.avatars, public.counted_cards from anon, authenticated;
revoke select on public.user_avatars, public.user_gacha, public.theme_unlocks from anon;


-- ---------------------------------------------------------------------
-- 2. Settings in one place (change the numbers here, then re-run just
--    this function to apply them)
-- ---------------------------------------------------------------------
create or replace function public.gacha_setting(p_key text)
returns numeric
language sql immutable
set search_path = ''
as $$
  select case p_key
    when 'reviews_per_ticket' then 100
    when 'pity_pulls'         then 50     -- hidden: after this many pulls without a Secret, the next is a Secret
    when 'weight_normal'      then 69
    when 'weight_rare'        then 25
    when 'weight_super_rare'  then 5
    when 'weight_secret'      then 1
    when 'review_cooldown_hours' then 3   -- the same card can't count twice within this time
  end
$$;


-- ---------------------------------------------------------------------
-- 3. Helpers
-- ---------------------------------------------------------------------

-- Player level from the student's saved peak points (same formula as src/lib/points.js).
create or replace function public.gacha_player_level(p_user uuid)
returns int
language sql stable
security definer
set search_path = ''
as $$
  select floor(sqrt(coalesce(
           (select s.peak_points from public.user_stats s where s.user_id = p_user), 0
         ) / 20.0))::int + 1
$$;

-- Tickets the student can use right now.
-- = 1 free ticket after their first review
-- + 1 per 100 reviews
-- + 1 at every 10th player level
-- - tickets already used
create or replace function public.gacha_tickets_available(p_user uuid)
returns int
language sql stable
security definer
set search_path = ''
as $$
  select greatest(0,
           (case when g.reviews_counted >= 1 then 1 else 0 end)
         + floor(g.reviews_counted / public.gacha_setting('reviews_per_ticket'))::int
         + (public.gacha_player_level(p_user) / 10)
         - g.tickets_spent)
  from public.user_gacha g
  where g.user_id = p_user
$$;

-- Makes sure the student has a gacha row and owns the starter avatar(s).
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
end;
$$;

-- How many avatars of each rarity the student still doesn't have (active ones only).
create or replace function public.gacha_remaining(p_user uuid)
returns table (rarity text, remaining int)
language sql stable
security definer
set search_path = ''
as $$
  select a.rarity, count(*)::int
  from public.avatars a
  where a.active and not a.is_starter
    and not exists (select 1 from public.user_avatars ua
                    where ua.user_id = p_user and ua.avatar_id = a.id)
  group by a.rarity
$$;


-- ---------------------------------------------------------------------
-- 4. Counting reviews (runs automatically whenever a card is answered)
-- ---------------------------------------------------------------------
-- A card counts as one review when it was actually due and its schedule
-- changes (= it was answered). The same card counts at most once every
-- 3 hours, and a brand-new card (level 0) only ever counts once, so
-- まだ repeats and removing/re-adding a deck don't add extra reviews.
create or replace function public.gacha_count_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last timestamptz;
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

  insert into public.user_gacha (user_id, reviews_counted) values (new.user_id, 1)
  on conflict (user_id) do update
    set reviews_counted = public.user_gacha.reviews_counted + 1,
        updated_at = now();

  return new;
end;
$$;

create trigger user_cards_count_review
  after update on public.user_cards
  for each row execute function public.gacha_count_review();


-- ---------------------------------------------------------------------
-- 5. Functions the app calls
-- ---------------------------------------------------------------------

-- Everything the header button and gacha screen need, in one call.
-- Odds are "live": worked out from the rarities the student still has left.
-- (The hidden Secret guarantee is NOT shown here.)
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
    'reviews_to_next_ticket', v_per - (v_g.reviews_counted % v_per),
    'reviews_per_ticket', v_per,
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

-- One pull. Uses a ticket and gives an avatar the student doesn't have yet.
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
  where a.active and not a.is_starter and a.rarity = v_rarity
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

-- The collection (アバター図鑑). Unowned avatars come back without their
-- name (so students guess from the silhouette); unowned Secrets also come
-- back without their picture (shown as ???).
create or replace function public.gacha_collection()
returns table (
  id bigint, slug text, rarity text, series text, sort_order int,
  owned boolean, obtained_at timestamptz, equipped boolean,
  name_ja text, name_en text, image_url text
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
         case when ua.avatar_id is not null or a.rarity <> 'secret' then a.image_url end
  from public.avatars a
  left join public.user_avatars ua on ua.avatar_id = a.id and ua.user_id = v_user
  left join public.user_gacha g on g.user_id = v_user
  where a.active
  order by a.series,
           array_position(array['normal', 'rare', 'super_rare', 'secret'], a.rarity),
           a.sort_order, a.id;
end;
$$;

-- Choose which owned avatar to show.
create or replace function public.gacha_equip_avatar(p_avatar_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not_signed_in'; end if;
  if not exists (select 1 from public.user_avatars ua
                 join public.avatars a on a.id = ua.avatar_id
                 where ua.user_id = v_user and ua.avatar_id = p_avatar_id and a.active) then
    raise exception 'not_owned';
  end if;
  perform public.gacha_ensure(v_user);
  update public.user_gacha set equipped_avatar_id = p_avatar_id, updated_at = now()
  where user_id = v_user;
end;
$$;

-- Choose a theme (only ones unlocked at the student's player level).
create or replace function public.gacha_set_theme(p_theme text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'not_signed_in'; end if;
  if not exists (select 1 from public.theme_unlocks t
                 where t.theme_key = p_theme
                   and t.unlock_level <= public.gacha_player_level(v_user)) then
    raise exception 'theme_locked';
  end if;
  perform public.gacha_ensure(v_user);
  update public.user_gacha set theme = p_theme, updated_at = now()
  where user_id = v_user;
end;
$$;

-- Only signed-in students may call the app functions; helpers are internal.
revoke execute on function
  public.gacha_setting(text), public.gacha_player_level(uuid), public.gacha_tickets_available(uuid),
  public.gacha_ensure(uuid), public.gacha_remaining(uuid), public.gacha_count_review(),
  public.gacha_status(), public.gacha_pull(), public.gacha_collection(),
  public.gacha_equip_avatar(bigint), public.gacha_set_theme(text)
  from public, anon, authenticated;
grant execute on function
  public.gacha_status(), public.gacha_pull(), public.gacha_collection(),
  public.gacha_equip_avatar(bigint), public.gacha_set_theme(text)
  to authenticated;


-- ---------------------------------------------------------------------
-- 6. Starting content
-- ---------------------------------------------------------------------
insert into public.theme_unlocks (theme_key, unlock_level) values
  ('midnight', 1), ('pizza', 5), ('lagoon', 10), ('sakura', 15), ('matcha', 20),
  ('autumn', 30), ('snow', 40), ('neon', 50), ('galaxy', 60), ('ryukoku', 70);

-- Series 1. Pictures come later (image_url NULL = placeholder).
-- Secrets are placeholders for now: rename them when the mascot and teachers are ready.
insert into public.avatars (slug, name_ja, name_en, rarity, is_starter, sort_order) values
  ('cat',        'ネコ',          'Cat',        'normal', true, 1),
  ('shiba',      '柴犬',          'Shiba Inu',  'normal', false, 2),
  ('penguin',    'ペンギン',      'Penguin',    'normal', false, 3),
  ('mouse',      'ネズミ',        'Mouse',      'normal', false, 4),
  ('rabbit',     'ウサギ',        'Rabbit',     'normal', false, 5),
  ('frog',       'カエル',        'Frog',       'normal', false, 6),
  ('chick',      'ヒヨコ',        'Chick',      'normal', false, 7),
  ('pig',        'ブタ',          'Pig',        'normal', false, 8),
  ('cow',        'ウシ',          'Cow',        'normal', false, 9),
  ('sheep',      'ヒツジ',        'Sheep',      'normal', false, 10),
  ('duck',       'アヒル',        'Duck',       'normal', false, 11),
  ('bear',       'クマ',          'Bear',       'normal', false, 12),
  ('monkey',     'サル',          'Monkey',     'normal', false, 13),
  ('tanuki',     'タヌキ',        'Tanuki',     'normal', false, 14),
  ('turtle',     'カメ',          'Turtle',     'normal', false, 15),
  ('hedgehog',   'ハリネズミ',    'Hedgehog',   'normal', false, 16),
  ('squirrel',   'リス',          'Squirrel',   'normal', false, 17),
  ('hamster',    'ハムスター',    'Hamster',    'normal', false, 18),
  ('crab',       'カニ',          'Crab',       'normal', false, 19),
  ('koala',      'コアラ',        'Koala',      'normal', false, 20),
  ('elephant',   'ゾウ',          'Elephant',   'normal', false, 21),
  ('giraffe',    'キリン',        'Giraffe',    'normal', false, 22),
  ('horse',      'ウマ',          'Horse',      'normal', false, 23),
  ('goat',       'ヤギ',          'Goat',       'normal', false, 24),
  ('seal',       'アザラシ',      'Seal',       'normal', false, 25),
  ('parrot',     'オウム',        'Parrot',     'normal', false, 26),
  ('otter',      'カワウソ',      'Otter',      'normal', false, 27),
  ('sloth',      'ナマケモノ',    'Sloth',      'normal', false, 28),
  ('hippo',      'カバ',          'Hippo',      'normal', false, 29),
  ('chicken',    'ニワトリ',      'Chicken',    'normal', false, 30),
  ('fox',        'キツネ',        'Fox',        'rare', false, 31),
  ('owl',        'フクロウ',      'Owl',        'rare', false, 32),
  ('panda',      'パンダ',        'Panda',      'rare', false, 33),
  ('red-panda',  'レッサーパンダ','Red Panda',  'rare', false, 34),
  ('tiger',      'トラ',          'Tiger',      'rare', false, 35),
  ('shark',      'サメ',          'Shark',      'rare', false, 36),
  ('octopus',    'タコ',          'Octopus',    'rare', false, 37),
  ('flamingo',   'フラミンゴ',    'Flamingo',   'rare', false, 38),
  ('deer',       'シカ',          'Deer',       'rare', false, 39),
  ('wolf',       'オオカミ',      'Wolf',       'rare', false, 40),
  ('dragon',     'ドラゴン',      'Dragon',     'super_rare', false, 41),
  ('robot',      'ロボット',      'Robot',      'super_rare', false, 42),
  ('phoenix',    '不死鳥',        'Phoenix',    'super_rare', false, 43),
  ('unicorn',    'ユニコーン',    'Unicorn',    'super_rare', false, 44),
  ('ninja-cat',  '忍者ネコ',      'Ninja Cat',  'super_rare', false, 45),
  ('secret-1',   'シークレット 1', 'Secret 1',  'secret', false, 46),
  ('secret-2',   'シークレット 2', 'Secret 2',  'secret', false, 47),
  ('secret-3',   'シークレット 3', 'Secret 3',  'secret', false, 48),
  ('secret-4',   'シークレット 4', 'Secret 4',  'secret', false, 49),
  ('secret-5',   'シークレット 5', 'Secret 5',  'secret', false, 50);
