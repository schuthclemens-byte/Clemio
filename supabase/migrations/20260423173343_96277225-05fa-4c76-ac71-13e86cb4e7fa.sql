-- Vorab: alte Funktion entfernen (anderes Rückgabeformat)
DROP FUNCTION IF EXISTS public.request_voice_consent(uuid);

-- 1. Neue Spalte: ob Push verschickt wurde (für Shadow-Limit)
ALTER TABLE public.voice_consents
  ADD COLUMN IF NOT EXISTS push_sent boolean NOT NULL DEFAULT false;

-- 2. Logging-Tabelle für Rate-Limit-Tracking & Monitoring
CREATE TABLE IF NOT EXISTS public.voice_request_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  outcome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_request_log_sender_time
  ON public.voice_request_log (sender_id, created_at DESC);

ALTER TABLE public.voice_request_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read voice request log" ON public.voice_request_log;
CREATE POLICY "Admins can read voice request log"
  ON public.voice_request_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Direkten INSERT in voice_consents verbieten
DROP POLICY IF EXISTS "Users can request consent" ON public.voice_consents;

-- 4. Neue, gehärtete Funktion request_voice_consent
CREATE FUNCTION public.request_voice_consent(_voice_owner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender uuid := auth.uid();
  _existing_id uuid;
  _existing_status text;
  _existing_updated timestamptz;
  _account_age interval;
  _trust_count int;
  _count_minute int;
  _count_hour int;
  _count_day int;
  _shadow boolean := false;
  _new_id uuid;
BEGIN
  IF _sender IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF _voice_owner_id = _sender THEN
    INSERT INTO public.voice_request_log(sender_id, receiver_id, outcome)
      VALUES (_sender, _voice_owner_id, 'self');
    RAISE EXCEPTION 'invalid_request' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocked_by = _voice_owner_id AND user_id = _sender)
       OR (blocked_by = _sender AND user_id = _voice_owner_id)
  ) THEN
    INSERT INTO public.voice_request_log(sender_id, receiver_id, outcome)
      VALUES (_sender, _voice_owner_id, 'blocked');
    RAISE EXCEPTION 'request_not_allowed' USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.voice_profiles WHERE user_id = _voice_owner_id
  ) THEN
    INSERT INTO public.voice_request_log(sender_id, receiver_id, outcome)
      VALUES (_sender, _voice_owner_id, 'no_voice_profile');
    RAISE EXCEPTION 'request_not_allowed' USING ERRCODE = 'P0001';
  END IF;

  SELECT id, status, updated_at
    INTO _existing_id, _existing_status, _existing_updated
  FROM public.voice_consents
  WHERE voice_owner_id = _voice_owner_id
    AND granted_to_user_id = _sender;

  IF _existing_id IS NOT NULL THEN
    IF _existing_status IN ('pending', 'granted') THEN
      INSERT INTO public.voice_request_log(sender_id, receiver_id, outcome)
        VALUES (_sender, _voice_owner_id, 'duplicate');
      RAISE EXCEPTION 'duplicate_request' USING ERRCODE = 'P0001';
    END IF;
    IF _existing_status = 'denied' AND _existing_updated > now() - interval '24 hours' THEN
      INSERT INTO public.voice_request_log(sender_id, receiver_id, outcome)
        VALUES (_sender, _voice_owner_id, 'cooldown');
      RAISE EXCEPTION 'cooldown_active' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT now() - COALESCE(u.created_at, now())
    INTO _account_age
  FROM auth.users u
  WHERE u.id = _sender;

  IF _account_age IS NOT NULL AND _account_age < interval '24 hours' THEN
    SELECT count(*) INTO _trust_count
    FROM public.voice_request_log
    WHERE sender_id = _sender
      AND outcome IN ('created', 'created_shadow');

    IF _trust_count >= 2 THEN
      INSERT INTO public.voice_request_log(sender_id, receiver_id, outcome)
        VALUES (_sender, _voice_owner_id, 'trust_limit');
      RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT count(*) INTO _count_minute
  FROM public.voice_request_log
  WHERE sender_id = _sender
    AND outcome IN ('created', 'created_shadow')
    AND created_at > now() - interval '1 minute';

  IF _count_minute >= 3 THEN
    INSERT INTO public.voice_request_log(sender_id, receiver_id, outcome)
      VALUES (_sender, _voice_owner_id, 'rate_limited_minute');
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO _count_hour
  FROM public.voice_request_log
  WHERE sender_id = _sender
    AND outcome IN ('created', 'created_shadow')
    AND created_at > now() - interval '1 hour';

  IF _count_hour >= 5 THEN
    INSERT INTO public.voice_request_log(sender_id, receiver_id, outcome)
      VALUES (_sender, _voice_owner_id, 'rate_limited_hour');
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO _count_day
  FROM public.voice_request_log
  WHERE sender_id = _sender
    AND outcome IN ('created', 'created_shadow')
    AND created_at > now() - interval '24 hours';

  IF _count_day >= 20 THEN
    INSERT INTO public.voice_request_log(sender_id, receiver_id, outcome)
      VALUES (_sender, _voice_owner_id, 'rate_limited_day');
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  -- Shadow-Limit: bei >=80% eines Limits → kein Push
  IF _count_minute >= 3
     OR _count_hour >= 4
     OR _count_day >= 16
  THEN
    _shadow := true;
  END IF;

  IF _existing_id IS NOT NULL AND _existing_status = 'denied' THEN
    UPDATE public.voice_consents
    SET status = 'pending',
        updated_at = now(),
        push_sent = NOT _shadow
    WHERE id = _existing_id;
    _new_id := _existing_id;
  ELSE
    INSERT INTO public.voice_consents (voice_owner_id, granted_to_user_id, status, push_sent)
    VALUES (_voice_owner_id, _sender, 'pending', NOT _shadow)
    RETURNING id INTO _new_id;
  END IF;

  INSERT INTO public.voice_request_log(sender_id, receiver_id, outcome)
    VALUES (_sender, _voice_owner_id, CASE WHEN _shadow THEN 'created_shadow' ELSE 'created' END);

  RETURN jsonb_build_object(
    'consent_id', _new_id,
    'should_send_push', NOT _shadow
  );
END;
$$;

REVOKE ALL ON FUNCTION public.request_voice_consent(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_voice_consent(uuid) TO authenticated;