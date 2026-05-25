CREATE OR REPLACE FUNCTION public.start_premium_trial()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _phone text;
  _key text;
  _trial_end timestamptz;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT p.phone_normalized INTO _phone
  FROM public.profiles p
  WHERE auth.uid() = p.id;

  IF _phone IS NULL OR length(trim(_phone)) = 0 THEN
    RAISE EXCEPTION 'phone_required_for_trial';
  END IF;

  _key := public._compute_phone_trial_key(_phone);
  IF _key IS NULL THEN
    RAISE EXCEPTION 'phone_required_for_trial';
  END IF;

  INSERT INTO public.subscriptions (user_id, plan)
  VALUES (_uid, 'free')
  ON CONFLICT (user_id) DO NOTHING;

  IF EXISTS (
    SELECT 1 FROM public.premium_trial_claims
    WHERE user_id = _uid OR phone_trial_key = _key
  ) THEN
    RAISE EXCEPTION 'trial_already_used';
  END IF;

  _trial_end := now() + interval '3 days';

  INSERT INTO public.premium_trial_claims (user_id, phone_trial_key, trial_started_at, trial_ends_at)
  VALUES (_uid, _key, now(), _trial_end);

  UPDATE public.subscriptions
  SET has_used_premium_trial = true,
      premium_status = 'trial',
      premium_trial_started_at = now(),
      premium_trial_ends_at = _trial_end,
      premium_plan = 'monthly',
      updated_at = now()
  WHERE user_id = _uid;

  RETURN jsonb_build_object(
    'status', 'trial',
    'trial_ends_at', _trial_end
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.start_premium_trial() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_premium_trial() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_premium_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _sub public.subscriptions%ROWTYPE;
  _phone text;
  _whitelisted boolean := false;
  _effective text := 'free';
  _ends timestamptz;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('status','free','isPremium',false,'isTrialActive',false,'hasUsedTrial',false);
  END IF;

  INSERT INTO public.subscriptions (user_id, plan) VALUES (_uid, 'free')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO _sub FROM public.subscriptions WHERE user_id = _uid;

  SELECT p.phone_normalized INTO _phone
  FROM public.profiles p
  WHERE auth.uid() = p.id;

  IF _phone IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.premium_whitelist WHERE phone_number = _phone
  ) THEN
    _whitelisted := true;
  END IF;

  IF _whitelisted
     OR _sub.is_founding_user
     OR (_sub.premium_until IS NOT NULL AND _sub.premium_until > now()) THEN
    _effective := 'premium';
    _ends := COALESCE(_sub.premium_until, _sub.premium_current_period_end);
  ELSIF _sub.premium_current_period_end IS NOT NULL AND _sub.premium_current_period_end > now() THEN
    _effective := 'premium';
    _ends := _sub.premium_current_period_end;
  ELSIF _sub.premium_trial_ends_at IS NOT NULL AND _sub.premium_trial_ends_at > now() THEN
    _effective := 'trial';
    _ends := _sub.premium_trial_ends_at;
  ELSIF _sub.has_used_premium_trial THEN
    _effective := 'expired';
  ELSE
    _effective := 'free';
  END IF;

  IF _sub.premium_status IS DISTINCT FROM _effective THEN
    UPDATE public.subscriptions SET premium_status = _effective, updated_at = now() WHERE user_id = _uid;
  END IF;

  RETURN jsonb_build_object(
    'status', _effective,
    'isPremium', _effective = 'premium' OR _effective = 'trial',
    'isTrialActive', _effective = 'trial',
    'hasUsedTrial', COALESCE(_sub.has_used_premium_trial, false),
    'canStartTrial', NOT COALESCE(_sub.has_used_premium_trial, false) AND _phone IS NOT NULL AND _effective NOT IN ('premium','trial'),
    'trialEndsAt', _sub.premium_trial_ends_at,
    'periodEnd', _ends,
    'plan', _sub.premium_plan,
    'isFoundingUser', COALESCE(_sub.is_founding_user, false),
    'isWhitelisted', _whitelisted
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_premium_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_premium_status() TO authenticated;