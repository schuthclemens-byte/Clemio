CREATE OR REPLACE FUNCTION public.request_voice_consent(_voice_owner_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  existing record;
  new_id uuid;
BEGIN
  -- Block self-request
  IF _voice_owner_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot request consent from yourself';
  END IF;

  -- Check for existing record
  SELECT id, status, updated_at INTO existing
  FROM public.voice_consents
  WHERE voice_owner_id = _voice_owner_id
    AND granted_to_user_id = auth.uid();

  IF existing.id IS NOT NULL THEN
    -- If pending or granted, block duplicate
    IF existing.status IN ('pending', 'granted') THEN
      RAISE EXCEPTION 'Consent request already exists for this pair';
    END IF;

    -- If denied, enforce 24h cooldown
    IF existing.status = 'denied' THEN
      IF existing.updated_at > now() - interval '24 hours' THEN
        RAISE EXCEPTION 'Cooldown active. Please wait before requesting again.';
      END IF;
      -- Cooldown passed: reset to pending
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
$$;