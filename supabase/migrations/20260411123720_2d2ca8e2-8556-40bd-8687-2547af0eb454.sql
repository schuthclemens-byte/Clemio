INSERT INTO public.profiles (id, phone_number, display_name)
SELECT
  au.id,
  COALESCE(
    NULLIF(au.raw_user_meta_data->>'phone_number', ''),
    NULLIF(regexp_replace(split_part(COALESCE(au.email, ''), '@', 1), '[^0-9]', '', 'g'), ''),
    au.id::text
  ) AS phone_number,
  COALESCE(
    NULLIF(au.raw_user_meta_data->>'display_name', ''),
    NULLIF(au.raw_user_meta_data->>'full_name', ''),
    'Nutzer'
  ) AS display_name
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

CREATE OR REPLACE FUNCTION public.ensure_current_profile(
  profile_phone_number text DEFAULT NULL,
  profile_display_name text DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_claims jsonb := auth.jwt();
  jwt_metadata jsonb := COALESCE(jwt_claims -> 'user_metadata', '{}'::jsonb);
  jwt_email text := jwt_claims ->> 'email';
  fallback_phone text := NULLIF(regexp_replace(split_part(COALESCE(jwt_email, ''), '@', 1), '[^0-9]', '', 'g'), '');
  resolved_phone text := COALESCE(
    NULLIF(profile_phone_number, ''),
    NULLIF(jwt_metadata ->> 'phone_number', ''),
    fallback_phone,
    auth.uid()::text
  );
  resolved_display_name text := COALESCE(
    NULLIF(profile_display_name, ''),
    NULLIF(jwt_metadata ->> 'display_name', ''),
    NULLIF(jwt_metadata ->> 'full_name', ''),
    'Nutzer'
  );
  synced_profile public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.profiles AS p (id, phone_number, display_name)
  VALUES (auth.uid(), resolved_phone, resolved_display_name)
  ON CONFLICT (id) DO UPDATE
  SET
    phone_number = CASE
      WHEN p.phone_number IS NULL OR p.phone_number = '' THEN EXCLUDED.phone_number
      ELSE p.phone_number
    END,
    display_name = CASE
      WHEN p.display_name IS NULL OR p.display_name = '' OR p.display_name = 'Nutzer' THEN EXCLUDED.display_name
      ELSE p.display_name
    END,
    updated_at = now()
  RETURNING * INTO synced_profile;

  RETURN synced_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_current_profile(text, text) TO authenticated;