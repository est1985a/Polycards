-- Rank curve: floor(sqrt(EXP / 10)) + 1 (was / 20). Already applied 2026-11-01.
create or replace function public.gacha_player_level(p_user uuid)
 returns integer language sql stable security definer set search_path to ''
as $function$
  select floor(sqrt((
           coalesce((select s.peak_points from public.user_stats s where s.user_id = p_user), 0)
         + coalesce((select t.bonus_points from public.user_study_totals t where t.user_id = p_user), 0)
         ) / 10.0))::int + 1
$function$;
