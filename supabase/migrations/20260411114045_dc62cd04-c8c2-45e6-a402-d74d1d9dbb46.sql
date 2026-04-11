-- Update request_voice_consent to verify target user has a voice profile
CREATE OR REPLACE FUNCTION public.request_voice_consent(_voice_owner_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  existing record;
  new_id uuid;
BEGIN
  -- Block self-request
  IF _voice_owner_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot request consent from yourself';
  END IF;

  -- Verify target user has a voice profile
  IF NOT EXISTS (
    SELECT 1 FROM public.voice_profiles WHERE user_id = _voice_owner_id
  ) THEN
    RAISE EXCEPTION 'Target user has no voice profile';
  END IF;

  -- Check for existing record
  SELECT id, status, updated_at INTO existing
  FROM public.voice_consents
  WHERE voice_owner_id = _voice_owner_id
    AND granted_to_user_id = auth.uid();

  IF existing.id IS NOT NULL THEN
    IF existing.status IN ('pending', 'granted') THEN
      RAISE EXCEPTION 'Consent request already exists for this pair';
    END IF;

    IF existing.status = 'denied' THEN
      IF existing.updated_at > now() - interval '24 hours' THEN
        RAISE EXCEPTION 'Cooldown active. Please wait before requesting again.';
      END IF;
      UPDATE public.voice_consents
      SET status = 'pending', updated_at = now()
      WHERE id = existing.id;
      RETURN existing.id;
    END IF;
  END IF;

  INSERT INTO public.voice_consents (voice_owner_id, granted_to_user_id, status)
  VALUES (_voice_owner_id, auth.uid(), 'pending')
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$function$;

-- Also tighten the direct INSERT policy to require voice profile exists
DROP POLICY IF EXISTS "Users can request consent" ON public.voice_consents;
CREATE POLICY "Users can request consent" ON public.voice_consents
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = granted_to_user_id
    AND EXISTS (
      SELECT 1 FROM public.voice_profiles WHERE user_id = voice_owner_id
    )
  );