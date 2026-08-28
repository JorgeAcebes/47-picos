-- supabase/migrations/013_allow_multiple_ascents.sql

-- Drop the old unique constraint (which only allowed 1 ascent per summit per user)
alter table public.ascents drop constraint if exists ascents_user_id_summit_id_key;

-- Add a new constraint that allows multiple ascents as long as the date is different
alter table public.ascents add constraint ascents_user_id_summit_id_achieved_on_key unique (user_id, summit_id, achieved_on);

-- Update the ranking function so it doesn't count the same summit multiple times
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
    count(distinct a.summit_id) as ascents_count
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
  having count(distinct a.summit_id) > 0
  order by ascents_count desc, p.username asc;
end;
$$ language plpgsql security definer;
