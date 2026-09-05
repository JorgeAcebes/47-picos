-- Drop restrictive SELECT policies if they exist (they might prevent public/connections from reading)
DROP POLICY IF EXISTS "Users can view their own experience records" ON public.experience_records;
DROP POLICY IF EXISTS "Users can view their own custom categories" ON public.custom_experience_categories;
DROP POLICY IF EXISTS "Users can view their own custom experiences" ON public.custom_experiences;
DROP POLICY IF EXISTS "Users can view their own hidden items" ON public.hidden_items;

-- Enable RLS just in case (though it should already be enabled)
ALTER TABLE public.experience_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_experience_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hidden_items ENABLE ROW LEVEL SECURITY;

-- Create policies for experience_records
CREATE POLICY "Public and connections can read experience records" ON public.experience_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = experience_records.user_id
    AND profiles.is_public = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.connections
    WHERE connections.following_id = experience_records.user_id
    AND connections.follower_id = auth.uid()
    AND connections.status = 'accepted'
  )
  OR
  auth.uid() = user_id
);

-- Create policies for custom_experience_categories
CREATE POLICY "Public and connections can read custom categories" ON public.custom_experience_categories
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = custom_experience_categories.user_id
    AND profiles.is_public = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.connections
    WHERE connections.following_id = custom_experience_categories.user_id
    AND connections.follower_id = auth.uid()
    AND connections.status = 'accepted'
  )
  OR
  auth.uid() = user_id
);

-- Create policies for custom_experiences
CREATE POLICY "Public and connections can read custom experiences" ON public.custom_experiences
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = custom_experiences.user_id
    AND profiles.is_public = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.connections
    WHERE connections.following_id = custom_experiences.user_id
    AND connections.follower_id = auth.uid()
    AND connections.status = 'accepted'
  )
  OR
  auth.uid() = user_id
);

-- Create policies for hidden_items
CREATE POLICY "Public and connections can read hidden items" ON public.hidden_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = hidden_items.user_id
    AND profiles.is_public = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.connections
    WHERE connections.following_id = hidden_items.user_id
    AND connections.follower_id = auth.uid()
    AND connections.status = 'accepted'
  )
  OR
  auth.uid() = user_id
);
