-- 003_social_schema.sql

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  is_public boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique(follower_id, following_id)
);

alter table public.profiles enable row level security;
alter table public.connections enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Connections policies
create policy "Users can view their connections" on public.connections
  for select using (auth.uid() = follower_id or auth.uid() = following_id);

create policy "Users can follow others" on public.connections
  for insert with check (auth.uid() = follower_id);

create policy "Users can update connection requests they received" on public.connections
  for update using (auth.uid() = following_id);

create policy "Users can delete connections they are part of" on public.connections
  for delete using (auth.uid() = follower_id or auth.uid() = following_id);

-- Ascents & Photos new read policies
create policy "Public and connections can read ascents" on public.ascents
  for select to authenticated using (
    exists (
      select 1 from public.profiles
      where id = ascents.user_id and is_public = true
    ) OR
    exists (
      select 1 from public.connections
      where follower_id = auth.uid() and following_id = ascents.user_id and status = 'accepted'
    )
  );

create policy "Public and connections can read summit photos" on public.summit_photos
  for select to authenticated using (
    exists (
      select 1 from public.profiles
      where id = summit_photos.user_id and is_public = true
    ) OR
    exists (
      select 1 from public.connections
      where follower_id = auth.uid() and following_id = summit_photos.user_id and status = 'accepted'
    )
  );

-- RPC for recommended profiles (friends of friends)
create or replace function public.get_recommended_profiles()
returns setof public.profiles as $$
begin
  return query
  select distinct p.*
  from public.profiles p
  join public.connections c1 on c1.following_id = p.id
  join public.connections c2 on c2.following_id = c1.follower_id
  where c2.follower_id = auth.uid()
    and c1.status = 'accepted'
    and c2.status = 'accepted'
    and p.id != auth.uid()
    and not exists (
      select 1 from public.connections c3
      where c3.follower_id = auth.uid() and c3.following_id = p.id
    );
end;
$$ language plpgsql security definer;
