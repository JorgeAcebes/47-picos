-- 023_test_profiles_exclusion.sql
-- Exclusion and stealth isolation for automated test profiles:
-- 1. Adds is_test column to public.profiles.
-- 2. Restricts public visibility via RLS so non-owners cannot query test profiles.
-- 3. Updates get_user_ranking() to exclude test profiles completely.
-- 4. Updates get_recommended_profiles() to exclude test profiles.
-- 5. Updates get_collective_visited_countries() to exclude test profiles.
-- 6. Updates handle_new_user() trigger to automatically set is_test based on metadata or test email/username conventions.

-- 1. Add is_test column to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_profiles_is_test ON public.profiles(is_test) WHERE is_test = true;

-- 2. Update SELECT policy on public.profiles:
-- Owners can always see their own profile. Other users can only see profiles that are public and NOT marked as test.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
    OR (is_public = true AND (is_test IS NOT TRUE))
  );

-- 3. Update get_user_ranking to strictly omit test accounts
CREATE OR REPLACE FUNCTION public.get_user_ranking(
  p_summit_ids text[] default null,
  p_following_only boolean default false,
  p_follower uuid default null,
  p_mode text default 'countries'
) RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  ascents_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS user_id,
    p.username,
    p.avatar_url,
    count(distinct a.summit_id) AS ascents_count
  FROM public.profiles p
  LEFT JOIN public.ascents a ON p.id = a.user_id 
    AND a.is_wishlist = false
    AND (p_summit_ids is null or a.summit_id = any(p_summit_ids))
    AND (
      (p_mode = 'countries' and a.summit_id like 'country-%') or
      (p_mode = 'peaks' and a.summit_id not like 'country-%' and a.summit_id not like 'region-%')
    )
  WHERE 
    (p.is_test IS NOT TRUE)
    AND (p_following_only = false or p.id = p_follower or p.id in (
      select following_id from public.connections where follower_id = p_follower and status = 'accepted'
    ))
    AND (
      p.is_public = true 
      or p.id = p_follower
      or p.id in (select following_id from public.connections where follower_id = p_follower and status = 'accepted')
    )
  GROUP BY p.id, p.username, p.avatar_url
  HAVING count(distinct a.summit_id) > 0
  ORDER BY ascents_count desc, p.username asc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update get_recommended_profiles to omit test accounts
CREATE OR REPLACE FUNCTION public.get_recommended_profiles()
RETURNS SETOF public.profiles AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.*
  FROM public.profiles p
  JOIN public.connections c1 ON c1.following_id = p.id
  JOIN public.connections c2 ON c2.following_id = c1.follower_id
  WHERE c2.follower_id = auth.uid()
    AND c1.status = 'accepted'
    AND c2.status = 'accepted'
    AND p.id != auth.uid()
    AND (p.is_test IS NOT TRUE)
    AND NOT EXISTS (
      SELECT 1 FROM public.connections c3
      WHERE c3.follower_id = auth.uid() AND c3.following_id = p.id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update get_collective_visited_countries to omit test accounts
CREATE OR REPLACE FUNCTION public.get_collective_visited_countries()
RETURNS TABLE (country_id text, visitor_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT a.summit_id AS country_id, COUNT(DISTINCT a.user_id) AS visitor_count
  FROM public.ascents a
  JOIN public.profiles p ON p.id = a.user_id
  WHERE a.summit_id LIKE 'country-%' 
    AND p.is_public = true 
    AND (p.is_test IS NOT TRUE)
  GROUP BY a.summit_id;
END;
$$;

-- 6. Update handle_new_user() trigger function to persist is_test
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
  v_is_test boolean := false;
  v_attempts int := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = new.id) THEN
    RETURN new;
  END IF;

  v_email := coalesce(new.email, '');
  v_base_username := split_part(v_email, '@', 1);
  v_base_username := lower(regexp_replace(v_base_username, '[^a-zA-Z0-9_]', '', 'g'));
  
  -- Determine is_test from user metadata or email/username convention
  IF (coalesce(new.raw_user_meta_data->>'is_test', 'false') = 'true') 
     OR (v_email ILIKE '%@test.%') 
     OR (v_email ILIKE '%@e2e.%') 
     OR (v_email ILIKE '%@example.com')
     OR (v_base_username ILIKE 'test_%')
     OR (v_base_username ILIKE 'qa_%') THEN
    v_is_test := true;
  END IF;

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
        INSERT INTO public.profiles (id, username, is_public, is_test)
        VALUES (new.id, v_username, true, v_is_test);
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
        INSERT INTO public.profiles (id, username, is_public, is_test)
        VALUES (new.id, v_username, true, v_is_test);
      EXCEPTION WHEN unique_violation THEN
        NULL;
      END IF;
      RETURN new;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
