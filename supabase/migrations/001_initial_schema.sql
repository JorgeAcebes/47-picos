-- Ejecuta este archivo una sola vez en el SQL Editor de tu proyecto Supabase.
create table if not exists public.ascents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  summit_id text not null,
  achieved_on date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, summit_id)
);

create table if not exists public.summit_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  summit_id text not null,
  storage_path text not null unique,
  public_url text not null,
  taken_on date not null,
  created_at timestamptz not null default now()
);

alter table public.ascents enable row level security;
alter table public.summit_photos enable row level security;

create policy "Users manage their own ascents" on public.ascents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own summit photos" on public.summit_photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Crea el bucket desde Storage si todavía no existe. Debe ser público porque
-- las URLs se guardan en la base de datos y solo son consultables por su dueño.
insert into storage.buckets (id, name, public)
values ('summit-photos', 'summit-photos', true)
on conflict (id) do update set public = true;

create policy "Users upload their own summit photos" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'summit-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Users update their own summit photos" on storage.objects
  for update to authenticated using (
    bucket_id = 'summit-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Users delete their own summit photos" on storage.objects
  for delete to authenticated using (
    bucket_id = 'summit-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Public reads summit images" on storage.objects
  for select to public using (bucket_id = 'summit-photos');
