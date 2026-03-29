-- Fix remaining data exposure issues
DROP POLICY IF EXISTS "Members can read conversation partner profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Authenticated can check voice profiles exist" ON public.voice_profiles;

CREATE OR REPLACE FUNCTION public.get_accessible_profiles(target_ids uuid[])
RETURNS TABLE(id uuid, display_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.id, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE p.id = ANY(target_ids)
    AND (
      p.id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.conversation_members cm1
        JOIN public.conversation_members cm2
          ON cm1.conversation_id = cm2.conversation_id
        WHERE cm1.user_id = auth.uid()
          AND cm2.user_id = p.id
      )
      OR EXISTS (
        SELECT 1
        FROM public.voice_consents vc
        WHERE (vc.voice_owner_id = auth.uid() AND vc.granted_to_user_id = p.id)
           OR (vc.voice_owner_id = p.id AND vc.granted_to_user_id = auth.uid())
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.get_accessible_voice_profile_states(target_ids uuid[])
RETURNS TABLE(user_id uuid, has_voice boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id AS user_id,
         EXISTS (
           SELECT 1
           FROM public.voice_profiles vp
           WHERE vp.user_id = t.id
         ) AS has_voice
  FROM unnest(target_ids) AS t(id)
  WHERE t.id = auth.uid()
     OR EXISTS (
       SELECT 1
       FROM public.conversation_members cm1
       JOIN public.conversation_members cm2
         ON cm1.conversation_id = cm2.conversation_id
       WHERE cm1.user_id = auth.uid()
         AND cm2.user_id = t.id
     )
     OR EXISTS (
       SELECT 1
       FROM public.voice_consents vc
       WHERE (vc.voice_owner_id = auth.uid() AND vc.granted_to_user_id = t.id)
          OR (vc.voice_owner_id = t.id AND vc.granted_to_user_id = auth.uid())
     );
$$;

DROP FUNCTION IF EXISTS public.search_profiles_by_query(text);
CREATE FUNCTION public.search_profiles_by_query(search_query text)
RETURNS TABLE(id uuid, display_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE COALESCE(search_query, '') <> ''
    AND (
      p.display_name ILIKE '%' || search_query || '%'
      OR p.phone_number ILIKE '%' || search_query || '%'
    )
  LIMIT 20;
$$;