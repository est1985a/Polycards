-- =====================================================================
-- Polyvo: gacha tickets for finishing ABCを書こう (2026-11-04)
-- Run once in the Supabase SQL editor, AFTER polycards-training-progress.sql
-- and polycards-gift-tickets.sql, and BEFORE deploying the app code that
-- shows the reward (until then the app hides it).
--
-- One ticket for all 26 capitals (A–Z) and one for all 26 small letters
-- (a–z), each only once per student. Letters saved before this file was
-- run count too. The student taps ガチャ券をもらう in the Training tab, which
-- calls claim_training_reward('abc-upper' | 'abc-lower').
--
-- The ticket is one ticket_gifts row (note 'training:abc-upper' /
-- 'training:abc-lower', award_id null), so the normal ticket count picks it
-- up (gacha_gifted_tickets) and it is outside the 1-a-day review cap.
-- It never appears as a teacher award: the award pop-up, 最近のチケット,
-- the student page history and the CSV all read ticket_awards, not
-- ticket_gifts.
--
-- Students may only read their own training_rewards rows; only
-- claim_training_reward() writes them. Safe to run twice.
-- =====================================================================

create table if not exists public.training_rewards (
  user_id        uuid not null references auth.users(id) on delete cascade,
  reward_id      text not null check (reward_id in ('abc-upper', 'abc-lower')),
  ticket_gift_id bigint references public.ticket_gifts(id) on delete set null,
  claimed_at     timestamptz not null default now(),
  primary key (user_id, reward_id)
);

alter table public.training_rewards enable row level security;
drop policy if exists "Read own training rewards" on public.training_rewards;
create policy "Read own training rewards" on public.training_rewards
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.training_rewards from anon, authenticated;
grant select on public.training_rewards to authenticated;


-- Claim one reward. → { claimed: true, already: false } = a ticket was given now;
-- { claimed: true, already: true } = it was given before (nothing changes).
-- Errors: not_signed_in, bad_reward, not_complete.
create or replace function public.claim_training_reward(p_reward_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user   uuid := auth.uid();
  v_prefix text;
  v_done   int;
  v_gift   bigint;
begin
  if v_user is null then raise exception 'not_signed_in'; end if;
  v_prefix := case p_reward_id when 'abc-upper' then 'abc-upper-'
                               when 'abc-lower' then 'abc-lower-' end;
  if v_prefix is null then raise exception 'bad_reward'; end if;

  -- All 26 exact practice ids of this case must be saved (abc-upper-a … abc-upper-z).
  select count(distinct p.practice_id) into v_done
  from public.user_training_progress p
  where p.user_id = v_user
    and p.practice_id = any (array(select v_prefix || chr(c) from generate_series(97, 122) c));
  if v_done <> 26 then raise exception 'not_complete'; end if;

  -- The primary key makes sure it is given only once, even with two taps at the same time.
  insert into public.training_rewards (user_id, reward_id) values (v_user, p_reward_id)
  on conflict (user_id, reward_id) do nothing;
  if not found then
    return jsonb_build_object('claimed', true, 'already', true);
  end if;

  perform public.gacha_ensure(v_user);
  insert into public.ticket_gifts (user_id, tickets, note)
  values (v_user, 1, 'training:' || p_reward_id)
  returning id into v_gift;
  update public.training_rewards set ticket_gift_id = v_gift
  where user_id = v_user and reward_id = p_reward_id;

  return jsonb_build_object('claimed', true, 'already', false);
end;
$$;

revoke execute on function public.claim_training_reward(text) from public, anon, authenticated;
grant execute on function public.claim_training_reward(text) to authenticated;


-- Look: who claimed which reward (newest first).
-- select u.email, coalesce(u.raw_user_meta_data->>'username', '') as username,
--        r.reward_id, r.claimed_at at time zone 'Asia/Tokyo' as claimed_at_japan
-- from public.training_rewards r join auth.users u on u.id = r.user_id
-- order by r.claimed_at desc;
