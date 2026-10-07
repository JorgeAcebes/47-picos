-- 025_add_second_link_to_records.sql
-- Añadir soporte para un segundo enlace (link_2 y link_name_2) en ascensos y registros de experiencias

ALTER TABLE public.ascents
ADD COLUMN IF NOT EXISTS link_2 TEXT,
ADD COLUMN IF NOT EXISTS link_name_2 TEXT;

ALTER TABLE public.experience_records
ADD COLUMN IF NOT EXISTS link_2 TEXT,
ADD COLUMN IF NOT EXISTS link_name_2 TEXT;
