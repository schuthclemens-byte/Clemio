CREATE OR REPLACE FUNCTION public.get_user_security_email(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result text;
BEGIN
  -- Only the owner, admins, or service_role may retrieve a user's security email
  IF auth.uid() IS NULL
     OR (auth.uid() <> _user_id AND NOT public.has_role(auth.uid(), 'admin'))
  THEN
    -- Allow service_role (used by trusted edge functions) to bypass
    IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
       AND current_user IS DISTINCT FROM 'service_role'
    THEN
      RETURN NULL;
    END IF;
  END IF;

  SELECT NULLIF(trim(security_email), '')
    INTO result
  FROM public.profiles
  WHERE id = _user_id;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_security_email(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_security_email(uuid) TO authenticated, service_role;