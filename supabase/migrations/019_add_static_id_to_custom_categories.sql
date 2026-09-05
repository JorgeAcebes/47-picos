-- Add static_id to custom_experience_categories to allow overriding predefined categories
ALTER TABLE public.custom_experience_categories
ADD COLUMN IF NOT EXISTS static_id text;

-- We want to ensure a user can only have one override per static_id
CREATE UNIQUE INDEX IF NOT EXISTS unique_static_id_per_user 
ON public.custom_experience_categories (user_id, static_id) 
WHERE static_id IS NOT NULL;
