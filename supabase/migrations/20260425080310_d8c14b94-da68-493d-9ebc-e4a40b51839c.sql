ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS security_email TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_security_email
ON public.profiles (lower(security_email))
WHERE security_email IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_user_security_email(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(trim(security_email), '')
  FROM public.profiles
  WHERE id = _user_id
    AND security_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  LIMIT 1
$$;