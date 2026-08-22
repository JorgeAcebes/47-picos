-- supabase/migrations/011_fix_peaks_ranking_regions.sql

create or replace function public.get_user_ranking(
  p_summit_ids text[] default null,
  p_following_only boolean default false,
  p_follower uuid default null,
  p_mode text default 'countries'
) returns table (
  user_id uuid,
  username text,
  avatar_url text,
  ascents_count bigint
) as $$
begin
  return query
  select
    p.id as user_id,
    p.username,
    p.avatar_url,
    count(a.summit_id) as ascents_count
  from public.profiles p
  left join public.ascents a on p.id = a.user_id 
    and a.is_wishlist = false
    and (p_summit_ids is null or a.summit_id = any(p_summit_ids))
    and (
      (p_mode = 'countries' and a.summit_id like 'country-%') or
      (p_mode = 'peaks' and a.summit_id not like 'country-%' and a.summit_id not like 'region-%')
    )
  where 
    (p_following_only = false or p.id = p_follower or p.id in (
      select following_id from public.connections where follower_id = p_follower and status = 'accepted'
    ))
    and (
      p.is_public = true 
      or p.id = p_follower
      or p.id in (select following_id from public.connections where follower_id = p_follower and status = 'accepted')
    )
  group by p.id, p.username, p.avatar_url
  having count(a.summit_id) > 0
  order by ascents_count desc, p.username asc;
end;
$$ language plpgsql security definer;
