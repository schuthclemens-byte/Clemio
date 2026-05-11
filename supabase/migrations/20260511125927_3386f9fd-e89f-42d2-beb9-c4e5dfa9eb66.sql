
-- =========================================================
-- Premium Trial System
-- =========================================================

-- 1. Extend subscriptions table (additive only)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS has_used_premium_trial boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS premium_trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS premium_status text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS premium_plan text,
  ADD COLUMN IF NOT EXISTS premium_current_period_end timestamptz;

-- Validation: premium_status must be one of allowed values
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_premium_status_check'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_premium_status_check
      CHECK (premium_status IN ('free','trial','premium','expired','canceled'));
  END IF;
END $$;

-- 2. premium_trial_claims table (anti-reuse wall)
-- NOTE: phone_trial_key is an HMAC-hash of the normalized phone number,
-- generated server-side using a secret pepper. It exists ONLY to prevent
-- abuse of the free trial. No device fingerprints, IMEI, or ad IDs are used.
-- Rows are NEVER deleted on account deletion (user_id may become NULL).
CREATE TABLE IF NOT EXISTS public.premium_trial_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  phone_trial_key text NOT NULL UNIQUE,
  trial_started_at timestamptz NOT NULL DEFAULT now(),
  trial_ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_premium_trial_claims_user_id ON public.premium_trial_claims(user_id);

ALTER TABLE public.premium_trial_claims ENABLE ROW LEVEL SECURITY;

-- Only own row readable. No INSERT/UPDATE/DELETE for authenticated.
DROP POLICY IF EXISTS "Users can read own trial claim" ON public.premium_trial_claims;
CREATE POLICY "Users can read own trial claim"
  ON public.premium_trial_claims
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 3. Ensure pgcrypto for hmac
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 4. Pepper bootstrap in internal_secrets (RLS denies all reads except SECURITY DEFINER fns)
INSERT INTO public.internal_secrets (key, value)
SELECT 'premium_trial_pepper', encode(gen_random_bytes(32), 'hex')
WHERE NOT EXISTS (SELECT 1 FROM public.internal_secrets WHERE key = 'premium_trial_pepper');

-- 5. Internal helper: compute phone_trial_key (HMAC-SHA256 with pepper)
CREATE OR REPLACE FUNCTION public._compute_phone_trial_key(_phone_normalized text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pepper text;
BEGIN
  IF _phone_normalized IS NULL OR length(trim(_phone_normalized)) = 0 THEN
    RETURN NULL;
  END IF;
  SELECT value INTO _pepper FROM public.internal_secrets WHERE key = 'premium_trial_pepper';
  IF _pepper IS NULL THEN
    RAISE EXCEPTION 'pepper_missing';
  END IF;
  RETURN encode(extensions.hmac(_phone_normalized, _pepper, 'sha256'), 'hex');
EXCEPTION WHEN undefined_function THEN
  -- fallback if hmac is in public schema
  RETURN encode(public.hmac(_phone_normalized, _pepper, 'sha256'), 'hex');
END;
$$;

REVOKE ALL ON FUNCTION public._compute_phone_trial_key(text) FROM PUBLIC, anon, authenticated;

-- 6. start_premium_trial RPC
CREATE OR REPLACE FUNCTION public.start_premium_trial()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _phone text;
  _key text;
  _trial_end timestamptz;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT phone_normalized INTO _phone FROM public.profiles WHERE id = _uid;

  IF _phone IS NULL OR length(trim(_phone)) = 0 THEN
    RAISE EXCEPTION 'phone_required_for_trial';
  END IF;

  _key := public._compute_phone_trial_key(_phone);
  IF _key IS NULL THEN
    RAISE EXCEPTION 'phone_required_for_trial';
  END IF;

  -- Ensure subscriptions row exists
  INSERT INTO public.subscriptions (user_id, plan)
  VALUES (_uid, 'free')
  ON CONFLICT (user_id) DO NOTHING;

  -- Reject if already used (by user_id OR by phone key from any prior account)
  IF EXISTS (
    SELECT 1 FROM public.premium_trial_claims
    WHERE user_id = _uid OR phone_trial_key = _key
  ) THEN
    RAISE EXCEPTION 'trial_already_used';
  END IF;

  _trial_end := now() + interval '3 days';

  -- Atomic insert (unique constraints protect against race)
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
$$;

REVOKE ALL ON FUNCTION public.start_premium_trial() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_premium_trial() TO authenticated;

-- 7. get_premium_status RPC
CREATE OR REPLACE FUNCTION public.get_premium_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Ensure subscriptions row
  INSERT INTO public.subscriptions (user_id, plan) VALUES (_uid, 'free')
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO _sub FROM public.subscriptions WHERE user_id = _uid;
  SELECT phone_normalized INTO _phone FROM public.profiles WHERE id = _uid;

  -- Whitelist check
  IF _phone IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.premium_whitelist WHERE phone_number = _phone
  ) THEN
    _whitelisted := true;
  END IF;

  -- Priority resolution
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

  -- Sync stored premium_status if it drifted
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
$$;

REVOKE ALL ON FUNCTION public.get_premium_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_premium_status() TO authenticated;

-- 8. On account deletion: keep claim, just nullify user_id (handled in delete-account fn)
-- Add helper RPC for service role to nullify
CREATE OR REPLACE FUNCTION public.anonymize_trial_claim_for_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.premium_trial_claims SET user_id = NULL WHERE user_id = _user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.anonymize_trial_claim_for_user(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonymize_trial_claim_for_user(uuid) TO service_role;
