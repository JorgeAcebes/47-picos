-- 022_audit_security_and_integrity_fixes.sql
-- Technical audit fixes: missing table declarations, complete write RLS policies,
-- approval bypass protection in connections, get_email_for_login security,
-- ascent dates validation, and concurrent handle_new_user TOCTOU fix.

-- 1. Ensure public.custom_experiences table exists
CREATE TABLE IF NOT EXISTS public.custom_experiences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.custom_experience_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon_name text NOT NULL DEFAULT 'star',
  sub_items jsonb,
  static_category_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Ensure public.experience_records table exists
CREATE TABLE IF NOT EXISTS public.experience_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  experience_id text NOT NULL,
  sub_item_id text,
  achieved_on date NOT NULL,
  notes text,
  link text,
  link_name text,
  lat double precision,
  lng double precision,
  location_name text,
  is_wishlist boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Ensure Row Level Security is enabled
ALTER TABLE public.custom_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_records ENABLE ROW LEVEL SECURITY;

-- 4. Full write policies for owner on custom_experiences
DROP POLICY IF EXISTS "Users can insert own custom experiences" ON public.custom_experiences;
CREATE POLICY "Users can insert own custom experiences" ON public.custom_experiences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own custom experiences" ON public.custom_experiences;
CREATE POLICY "Users can update own custom experiences" ON public.custom_experiences
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own custom experiences" ON public.custom_experiences;
CREATE POLICY "Users can delete own custom experiences" ON public.custom_experiences
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Full write policies for owner on experience_records
DROP POLICY IF EXISTS "Users can insert own experience records" ON public.experience_records;
CREATE POLICY "Users can insert own experience records" ON public.experience_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own experience records" ON public.experience_records;
CREATE POLICY "Users can update own experience records" ON public.experience_records
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own experience records" ON public.experience_records;
CREATE POLICY "Users can delete own experience records" ON public.experience_records
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Hardening connections against approval bypass
DROP POLICY IF EXISTS "Users can follow others" ON public.connections;
CREATE POLICY "Users can follow others" ON public.connections
  FOR INSERT WITH CHECK (
    auth.uid() = follower_id
    AND (
      (status = 'accepted' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = following_id AND is_public = true))
      OR (status = 'pending')
    )
  );

-- 7. Revoke public/anon access to get_email_for_login and restrict to service_role
REVOKE EXECUTE ON FUNCTION public.get_email_for_login(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_email_for_login(text) TO service_role;

-- 8. Add CHECK constraint on public.ascents to avoid inverted end dates
ALTER TABLE public.ascents DROP CONSTRAINT IF EXISTS check_end_date_after_start;
ALTER TABLE public.ascents ADD CONSTRAINT check_end_date_after_start CHECK (end_date IS NULL OR end_date >= achieved_on);

-- 9. Update handle_new_user() with EXCEPTION WHEN unique_violation THEN to eliminate TOCTOU in concurrency
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_base_username text;
  v_username text;
  v_exists boolean;
  v_attempts int := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = new.id) THEN
    RETURN new;
  END IF;

  v_email := coalesce(new.email, '');
  v_base_username := split_part(v_email, '@', 1);
  v_base_username := lower(regexp_replace(v_base_username, '[^a-zA-Z0-9_]', '', 'g'));
  
  -- Eliminar números del final
  v_base_username := regexp_replace(v_base_username, '[0-9]+$', '');
  
  IF length(v_base_username) < 3 THEN
    v_base_username := 'user';
  END IF;

  v_base_username := left(v_base_username, 16);
  v_username := v_base_username;

  LOOP
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = v_username) INTO v_exists;
    
    IF NOT v_exists THEN
      BEGIN
        INSERT INTO public.profiles (id, username, is_public)
        VALUES (new.id, v_username, true);
        RETURN new;
      EXCEPTION WHEN unique_violation THEN
        IF EXISTS (SELECT 1 FROM public.profiles WHERE id = new.id) THEN
          RETURN new;
        END IF;
      END;
    END IF;

    v_attempts := v_attempts + 1;
    v_username := v_base_username || lpad(floor(random() * 10000)::text, 4, '0');
    
    IF v_attempts > 50 THEN
      v_username := v_base_username || substr(new.id::text, 1, 8);
      BEGIN
        INSERT INTO public.profiles (id, username, is_public)
        VALUES (new.id, v_username, true);
      EXCEPTION WHEN unique_violation THEN
        NULL;
      END;
      RETURN new;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
