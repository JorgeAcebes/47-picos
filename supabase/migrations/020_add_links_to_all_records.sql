-- Add link and link_name columns to all records
ALTER TABLE public.ascents
ADD COLUMN IF NOT EXISTS link TEXT,
ADD COLUMN IF NOT EXISTS link_name TEXT;

ALTER TABLE public.experience_records
ADD COLUMN IF NOT EXISTS link_name TEXT;
