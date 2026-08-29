-- supabase/migrations/015_add_end_date.sql
alter table public.ascents add column if not exists end_date date;
