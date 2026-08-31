-- Add static_category_id to custom_experiences
ALTER TABLE public.custom_experiences
ADD COLUMN IF NOT EXISTS static_category_id text;

-- Add sub_items to custom_experiences for mini-experiences
ALTER TABLE public.custom_experiences
ADD COLUMN IF NOT EXISTS sub_items jsonb DEFAULT '[]'::jsonb;

-- Make category_id optional in custom_experiences (if it wasn't already)
ALTER TABLE public.custom_experiences
ALTER COLUMN category_id DROP NOT NULL;

-- Create hidden_items table
CREATE TABLE IF NOT EXISTS public.hidden_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_id text NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('category', 'experience')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, item_id, item_type)
);

-- RLS for hidden_items
ALTER TABLE public.hidden_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own hidden items"
  ON public.hidden_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own hidden items"
  ON public.hidden_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own hidden items"
  ON public.hidden_items FOR DELETE
  USING (auth.uid() = user_id);
