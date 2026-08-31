-- Create custom_experience_categories table
CREATE TABLE IF NOT EXISTS public.custom_experience_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  icon_name text NOT NULL DEFAULT 'star',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for custom_experience_categories
ALTER TABLE public.custom_experience_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own custom categories"
  ON public.custom_experience_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom categories"
  ON public.custom_experience_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom categories"
  ON public.custom_experience_categories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom categories"
  ON public.custom_experience_categories FOR DELETE
  USING (auth.uid() = user_id);

-- Add category_id to custom_experiences
ALTER TABLE public.custom_experiences
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.custom_experience_categories(id) ON DELETE CASCADE;

-- Add location_name to experience_records
ALTER TABLE public.experience_records
ADD COLUMN IF NOT EXISTS location_name text;

-- Drop icon_name from custom_experiences if it's no longer needed, but let's keep it for backward compatibility for now.
