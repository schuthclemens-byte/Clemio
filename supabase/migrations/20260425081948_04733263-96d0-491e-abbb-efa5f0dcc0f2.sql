-- Normalize contact phone numbers for matching without SMS verification
CREATE OR REPLACE FUNCTION public.normalize_contact_phone(_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  _digits text;
BEGIN
  IF _phone IS NULL THEN
    RETURN NULL;
  END IF;

  _digits := regexp_replace(_phone, '[^0-9]', '', 'g');

  IF _digits = '' THEN
    RETURN NULL;
  END IF;

  IF _digits LIKE '00%' THEN
    _digits := substr(_digits, 3);
  ELSIF _digits LIKE '0%' THEN
    _digits := '49' || substr(_digits, 2);
  END IF;

  IF char_length(_digits) < 7 OR char_length(_digits) > 15 THEN
    RETURN NULL;
  END IF;

  RETURN _digits;
END;
$$;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone_normalized text;

UPDATE public.profiles
SET phone_normalized = public.normalize_contact_phone(phone_number)
WHERE phone_normalized IS DISTINCT FROM public.normalize_contact_phone(phone_number);

CREATE INDEX IF NOT EXISTS idx_profiles_phone_normalized
ON public.profiles (phone_normalized)
WHERE phone_normalized IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_profile_phone_normalized()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.phone_normalized := public.normalize_contact_phone(NEW.phone_number);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_phone_normalized ON public.profiles;
CREATE TRIGGER trg_sync_profile_phone_normalized
BEFORE INSERT OR UPDATE OF phone_number ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_phone_normalized();

CREATE OR REPLACE FUNCTION public.match_contacts_by_phone(_phones text[])
RETURNS TABLE(user_id uuid, display_name text, avatar_url text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _normalized text[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF _phones IS NULL OR array_length(_phones, 1) IS NULL THEN
    RETURN;
  END IF;

  IF array_length(_phones, 1) > 500 THEN
    RAISE EXCEPTION 'too_many_contacts' USING ERRCODE = 'P0001';
  END IF;

  SELECT array_agg(DISTINCT normalized_phone)
  INTO _normalized
  FROM (
    SELECT public.normalize_contact_phone(phone) AS normalized_phone
    FROM unnest(_phones) AS phone
  ) values_to_match
  WHERE normalized_phone IS NOT NULL;

  IF _normalized IS NULL OR array_length(_normalized, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id AS user_id,
         COALESCE(NULLIF(p.display_name, ''), NULLIF(p.first_name, ''), 'Nutzer') AS display_name,
         p.avatar_url
  FROM public.profiles p
  WHERE p.id <> auth.uid()
    AND p.phone_normalized = ANY(_normalized)
  ORDER BY display_name
  LIMIT 100;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_contacts_by_phone(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_contact_phone(text) TO authenticated;