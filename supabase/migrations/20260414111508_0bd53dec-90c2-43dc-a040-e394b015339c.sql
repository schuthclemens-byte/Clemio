CREATE OR REPLACE FUNCTION public.get_blocked_profiles()
RETURNS TABLE(user_id uuid, display_name text, first_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id AS user_id, p.display_name, p.first_name, p.avatar_url
  FROM public.blocked_users b
  JOIN public.profiles p ON p.id = b.user_id
  WHERE b.blocked_by = auth.uid();
$$;