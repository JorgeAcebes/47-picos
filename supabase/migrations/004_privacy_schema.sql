-- 004_privacy_schema.sql

-- 1. Añadir nuevas columnas a profiles
alter table public.profiles add column if not exists share_photos boolean default true;
alter table public.profiles add column if not exists share_notes boolean default true;

-- 2. Actualizar políticas de ascents (que contiene las notas)
drop policy if exists "Public and connections can read ascents" on public.ascents;

create policy "Public and connections can read ascents" on public.ascents
  for select to authenticated using (
    exists (
      select 1 from public.profiles
      where id = ascents.user_id and share_notes = true and (
        is_public = true OR
        exists (
          select 1 from public.connections
          where follower_id = auth.uid() and following_id = ascents.user_id and status = 'accepted'
        )
      )
    ) OR ascents.user_id = auth.uid()
  );

-- 3. Actualizar políticas de summit_photos
drop policy if exists "Public and connections can read summit photos" on public.summit_photos;

create policy "Public and connections can read summit photos" on public.summit_photos
  for select to authenticated using (
    exists (
      select 1 from public.profiles
      where id = summit_photos.user_id and share_photos = true and (
        is_public = true OR
        exists (
          select 1 from public.connections
          where follower_id = auth.uid() and following_id = summit_photos.user_id and status = 'accepted'
        )
      )
    ) OR summit_photos.user_id = auth.uid()
  );
