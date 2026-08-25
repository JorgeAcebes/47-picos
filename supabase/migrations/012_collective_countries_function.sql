-- supabase/migrations/012_collective_countries_function.sql
-- Devuelve para cada pico/país visitado, la lista de usuarios que lo han visitado.
-- Solo incluye usuarios con perfil público o conectados con el solicitante, según p_following_only.

drop function if exists public.get_collective_countries();

create or replace function public.get_collective_summits(
  p_mode text default 'countries',
  p_following_only boolean default false
)
returns table (
  summit_id text,
  visitor_ids uuid[],
  visitor_usernames text[],
  visitor_avatars text[]
) as $$
begin
  return query
  select
    sub.summit_id,
    array_agg(sub.id) as visitor_ids,
    array_agg(sub.username) as visitor_usernames,
    array_agg(sub.avatar_url) as visitor_avatars
  from (
    select distinct
      a.summit_id,
      p.id,
      p.username,
      coalesce(p.avatar_url, '') as avatar_url
    from public.ascents a
    join public.profiles p on p.id = a.user_id
    where a.is_wishlist = false
      and (
        (p_mode = 'countries' and a.summit_id like 'country-%')
        or
        (p_mode = 'peaks' and a.summit_id not like 'country-%')
      )
      and (
        (p_following_only = false and p.is_public = true)
        or p.id = auth.uid()
        or p.id in (
          select following_id from public.connections
          where follower_id = auth.uid() and status = 'accepted'
        )
      )
  ) sub
  group by sub.summit_id;
end;
$$ language plpgsql security definer;
