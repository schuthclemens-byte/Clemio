
-- 1. Fix calls UPDATE policy: add WITH CHECK to prevent identity field tampering
DROP POLICY IF EXISTS "Participants can update calls" ON public.calls;

CREATE POLICY "Participants can update calls" ON public.calls
  FOR UPDATE TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- 2. Add trigger to block changes to identity fields on calls
CREATE OR REPLACE FUNCTION public.enforce_call_identity_fields()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.caller_id IS DISTINCT FROM OLD.caller_id THEN
    RAISE EXCEPTION 'Cannot change caller_id';
  END IF;
  IF NEW.receiver_id IS DISTINCT FROM OLD.receiver_id THEN
    RAISE EXCEPTION 'Cannot change receiver_id';
  END IF;
  IF NEW.conversation_id IS DISTINCT FROM OLD.conversation_id THEN
    RAISE EXCEPTION 'Cannot change conversation_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_call_identity ON public.calls;
CREATE TRIGGER trg_enforce_call_identity
  BEFORE UPDATE ON public.calls
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_call_identity_fields();

-- 3. Add RPC for voice consent requests with duplicate check
CREATE OR REPLACE FUNCTION public.request_voice_consent(_voice_owner_id uuid)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  existing_id uuid;
  new_id uuid;
BEGIN
  -- Block self-request
  IF _voice_owner_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot request consent from yourself';
  END IF;

  -- Check for existing record
  SELECT id INTO existing_id
  FROM public.voice_consents
  WHERE voice_owner_id = _voice_owner_id
    AND granted_to_user_id = auth.uid();

  IF existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'Consent request already exists for this pair';
  END IF;

  INSERT INTO public.voice_consents (voice_owner_id, granted_to_user_id, status)
  VALUES (_voice_owner_id, auth.uid(), 'pending')
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;
