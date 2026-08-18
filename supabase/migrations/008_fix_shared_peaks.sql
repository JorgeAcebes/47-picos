-- supabase/migrations/008_fix_shared_peaks.sql

-- Actualizamos el RPC con la nueva lógica del seguidor
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
      (p_mode = 'peaks' and a.summit_id not like 'country-%')
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


-- Borramos duplicados potenciales en caso de que alguien tuviese las dos provincias registradas.
DELETE FROM public.ascents a
WHERE EXISTS (
  SELECT 1 FROM public.ascents b
  WHERE a.user_id = b.user_id
    AND a.is_wishlist = b.is_wishlist
    AND a.id > b.id
    AND (
      (a.summit_id IN ('alava', 'bizkaia') AND b.summit_id IN ('alava', 'bizkaia')) OR
      (a.summit_id IN ('madrid', 'segovia') AND b.summit_id IN ('madrid', 'segovia')) OR
      (a.summit_id IN ('asturias', 'leon') AND b.summit_id IN ('asturias', 'leon')) OR
      (a.summit_id IN ('soria', 'zaragoza') AND b.summit_id IN ('soria', 'zaragoza')) OR
      (a.summit_id IN ('ourense', 'zamora') AND b.summit_id IN ('ourense', 'zamora'))
    )
);

-- Ahora que no hay duplicados en el mismo grupo, podemos actualizar seguro
update public.ascents set summit_id = 'gorbea' where summit_id in ('alava', 'bizkaia');
update public.ascents set summit_id = 'penalara' where summit_id in ('madrid', 'segovia');
update public.ascents set summit_id = 'cerredo' where summit_id in ('asturias', 'leon');
update public.ascents set summit_id = 'moncayo' where summit_id in ('soria', 'zaragoza');
update public.ascents set summit_id = 'trevinca' where summit_id in ('ourense', 'zamora');
