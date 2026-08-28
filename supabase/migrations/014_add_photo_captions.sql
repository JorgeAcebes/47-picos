-- supabase/migrations/014_add_photo_captions.sql

-- Add caption column to summit_photos to allow users to set subtitles for their photos
alter table public.summit_photos add column if not exists caption text;
