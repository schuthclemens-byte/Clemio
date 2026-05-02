-- =========================================================
-- 1. usage_limits (1 Zeile pro Plan)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.usage_limits (
  plan text PRIMARY KEY,
  voice_listen integer NOT NULL DEFAULT 0,
  ki_improve integer NOT NULL DEFAULT 0,
  translate integer NOT NULL DEFAULT 0,
  stt_minutes integer NOT NULL DEFAULT 0,
  tts_minutes integer NOT NULL DEFAULT 0,
  storage_mb integer NOT NULL DEFAULT 0,
  voice_retrain integer NOT NULL DEFAULT 0,
  active_voice integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read usage limits"
  ON public.usage_limits FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can modify usage limits"
  ON public.usage_limits FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Seed
INSERT INTO public.usage_limits (plan, voice_listen, ki_improve, translate, stt_minutes, tts_minutes, storage_mb, voice_retrain, active_voice)
VALUES
  ('free',     10,  5,   5,  10,   5,   50, 0, 0),
  ('trial',    300, 100, 100, 120, 180, 1024, 2, 1),
  ('premium',  300, 100, 100, 120, 180, 1024, 2, 1),
  ('founding', 300, 100, 100, 120, 180, 1024, 2, 1)
ON CONFLICT (plan) DO UPDATE SET
  voice_listen = EXCLUDED.voice_listen,
  ki_improve = EXCLUDED.ki_improve,
  translate = EXCLUDED.translate,
  stt_minutes = EXCLUDED.stt_minutes,
  tts_minutes = EXCLUDED.tts_minutes,
  storage_mb = EXCLUDED.storage_mb,
  voice_retrain = EXCLUDED.voice_retrain,
  active_voice = EXCLUDED.active_voice,
  updated_at = now();

-- =========================================================
-- 2. usage_counters
-- =========================================================
CREATE TABLE IF NOT EXISTS public.usage_counters (
  user_id uuid NOT NULL,
  period_start date NOT NULL,
  voice_listen integer NOT NULL DEFAULT 0,
  ki_improve integer NOT NULL DEFAULT 0,
  translate integer NOT NULL DEFAULT 0,
  stt_seconds integer NOT NULL DEFAULT 0,
  tts_seconds integer NOT NULL DEFAULT 0,
  storage_bytes bigint NOT NULL DEFAULT 0,
  voice_retrain integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_counters_period ON public.usage_counters(period_start DESC);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own counters"
  ON public.usage_counters FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all counters"
  ON public.usage_counters FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service role can write counters"
  ON public.usage_counters FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- =========================================================
-- 3. subscriptions: neue Spalten
-- =========================================================
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS subscription_provider text,
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_used boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_payment_failed_at timestamptz;

-- =========================================================
-- 4. handle_new_subscription: keine 50er Founding-Logik mehr
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_whitelisted boolean := false;
  user_phone text;
  normalized_phone text;
BEGIN
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.email);

  normalized_phone := user_phone;
  normalized_phone := regexp_replace(normalized_phone, '^\+49', '0');
  normalized_phone := regexp_replace(normalized_phone, '^0049', '0');
  normalized_phone := regexp_replace(normalized_phone, '[^0-9]', '', 'g');

  SELECT EXISTS (
    SELECT 1 FROM public.premium_whitelist
    WHERE regexp_replace(regexp_replace(regexp_replace(phone_number, '^\+49', '0'), '^0049', '0'), '[^0-9]', '', 'g') = normalized_phone
  ) INTO is_whitelisted;

  IF is_whitelisted THEN
    INSERT INTO public.subscriptions (user_id, plan, is_founding_user, trial_start, trial_end, premium_until, subscription_status, subscription_provider, trial_used)
    VALUES (NEW.id, 'founding', true, now(), NULL, '2099-12-31'::timestamptz, 'active', 'whitelist', false);
    RETURN NEW;
  END IF;

  -- Standard: 7 Tage Trial (kein Karten-Eintrag nötig)
  INSERT INTO public.subscriptions (
    user_id, plan, is_founding_user,
    trial_start, trial_end, premium_until,
    subscription_status, trial_used
  )
  VALUES (
    NEW.id, 'trial', false,
    now(), now() + interval '7 days', now() + interval '7 days',
    'trialing', true
  );

  RETURN NEW;
END;
$function$;

-- =========================================================
-- 5. RPC: get_user_usage_summary
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_user_usage_summary(_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _target uuid := COALESCE(_user_id, auth.uid());
  _is_admin boolean := public.has_role(auth.uid(), 'admin'::public.app_role);
  _period date := date_trunc('month', now())::date;
  _sub record;
  _limits record;
  _counters record;
  _plan text;
  _is_premium boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF _target <> auth.uid() AND NOT _is_admin THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _sub FROM public.subscriptions WHERE user_id = _target;

  _plan := COALESCE(_sub.plan, 'free');
  _is_premium := _plan IN ('founding', 'premium')
                 OR (_plan = 'trial' AND COALESCE(_sub.premium_until, 'epoch'::timestamptz) > now());

  -- Falls Trial abgelaufen → Free-Limits
  IF _plan = 'trial' AND COALESCE(_sub.premium_until, 'epoch'::timestamptz) <= now() THEN
    _plan := 'free';
  END IF;

  SELECT * INTO _limits FROM public.usage_limits WHERE plan = _plan;
  IF _limits IS NULL THEN
    SELECT * INTO _limits FROM public.usage_limits WHERE plan = 'free';
  END IF;

  SELECT * INTO _counters FROM public.usage_counters
   WHERE user_id = _target AND period_start = _period;

  RETURN jsonb_build_object(
    'plan', COALESCE(_sub.plan, 'free'),
    'effective_plan', _plan,
    'is_premium', _is_premium,
    'subscription_status', _sub.subscription_status,
    'current_period_end', _sub.current_period_end,
    'cancel_at_period_end', _sub.cancel_at_period_end,
    'trial_used', _sub.trial_used,
    'trial_end', _sub.trial_end,
    'premium_until', _sub.premium_until,
    'period_start', _period,
    'limits', jsonb_build_object(
      'voice_listen', _limits.voice_listen,
      'ki_improve', _limits.ki_improve,
      'translate', _limits.translate,
      'stt_minutes', _limits.stt_minutes,
      'tts_minutes', _limits.tts_minutes,
      'storage_mb', _limits.storage_mb,
      'voice_retrain', _limits.voice_retrain,
      'active_voice', _limits.active_voice
    ),
    'used', jsonb_build_object(
      'voice_listen', COALESCE(_counters.voice_listen, 0),
      'ki_improve', COALESCE(_counters.ki_improve, 0),
      'translate', COALESCE(_counters.translate, 0),
      'stt_seconds', COALESCE(_counters.stt_seconds, 0),
      'tts_seconds', COALESCE(_counters.tts_seconds, 0),
      'storage_bytes', COALESCE(_counters.storage_bytes, 0),
      'voice_retrain', COALESCE(_counters.voice_retrain, 0)
    )
  );
END;
$$;

-- =========================================================
-- 6. RPC: check_and_consume_quota (atomar)
--    NUR für Service Role gedacht - prüft + bumpt Counter
-- =========================================================
CREATE OR REPLACE FUNCTION public.check_and_consume_quota(
  _user_id uuid,
  _metric text,
  _amount integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _period date := date_trunc('month', now())::date;
  _plan text;
  _sub record;
  _limit_value integer;
  _used integer;
  _limit_metric text := _metric;
  _new_used integer;
BEGIN
  -- Plan ermitteln (effective)
  SELECT * INTO _sub FROM public.subscriptions WHERE user_id = _user_id;
  _plan := COALESCE(_sub.plan, 'free');
  IF _plan = 'trial' AND COALESCE(_sub.premium_until, 'epoch'::timestamptz) <= now() THEN
    _plan := 'free';
  END IF;

  -- Limit holen
  -- STT/TTS in Sekunden vergleichen, Limit ist Minuten
  IF _metric = 'stt_seconds' THEN
    SELECT stt_minutes * 60 INTO _limit_value FROM public.usage_limits WHERE plan = _plan;
  ELSIF _metric = 'tts_seconds' THEN
    SELECT tts_minutes * 60 INTO _limit_value FROM public.usage_limits WHERE plan = _plan;
  ELSIF _metric = 'storage_bytes' THEN
    SELECT storage_mb * 1024 * 1024 INTO _limit_value FROM public.usage_limits WHERE plan = _plan;
  ELSIF _metric = 'voice_listen' THEN
    SELECT voice_listen INTO _limit_value FROM public.usage_limits WHERE plan = _plan;
  ELSIF _metric = 'ki_improve' THEN
    SELECT ki_improve INTO _limit_value FROM public.usage_limits WHERE plan = _plan;
  ELSIF _metric = 'translate' THEN
    SELECT translate INTO _limit_value FROM public.usage_limits WHERE plan = _plan;
  ELSIF _metric = 'voice_retrain' THEN
    SELECT voice_retrain INTO _limit_value FROM public.usage_limits WHERE plan = _plan;
  ELSE
    RAISE EXCEPTION 'unknown_metric:%', _metric USING ERRCODE = 'P0001';
  END IF;

  IF _limit_value IS NULL THEN
    _limit_value := 0;
  END IF;

  -- Counter row sicherstellen
  INSERT INTO public.usage_counters (user_id, period_start)
  VALUES (_user_id, _period)
  ON CONFLICT (user_id, period_start) DO NOTHING;

  -- Aktuellen Wert lesen + atomar erhöhen
  IF _metric = 'voice_listen' THEN
    SELECT voice_listen INTO _used FROM public.usage_counters WHERE user_id = _user_id AND period_start = _period FOR UPDATE;
    IF _used + _amount > _limit_value THEN
      RAISE EXCEPTION 'quota_exceeded:voice_listen:%:%', _used, _limit_value USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.usage_counters SET voice_listen = voice_listen + _amount, updated_at = now()
      WHERE user_id = _user_id AND period_start = _period
      RETURNING voice_listen INTO _new_used;
  ELSIF _metric = 'ki_improve' THEN
    SELECT ki_improve INTO _used FROM public.usage_counters WHERE user_id = _user_id AND period_start = _period FOR UPDATE;
    IF _used + _amount > _limit_value THEN
      RAISE EXCEPTION 'quota_exceeded:ki_improve:%:%', _used, _limit_value USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.usage_counters SET ki_improve = ki_improve + _amount, updated_at = now()
      WHERE user_id = _user_id AND period_start = _period
      RETURNING ki_improve INTO _new_used;
  ELSIF _metric = 'translate' THEN
    SELECT translate INTO _used FROM public.usage_counters WHERE user_id = _user_id AND period_start = _period FOR UPDATE;
    IF _used + _amount > _limit_value THEN
      RAISE EXCEPTION 'quota_exceeded:translate:%:%', _used, _limit_value USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.usage_counters SET translate = translate + _amount, updated_at = now()
      WHERE user_id = _user_id AND period_start = _period
      RETURNING translate INTO _new_used;
  ELSIF _metric = 'stt_seconds' THEN
    SELECT stt_seconds INTO _used FROM public.usage_counters WHERE user_id = _user_id AND period_start = _period FOR UPDATE;
    IF _used + _amount > _limit_value THEN
      RAISE EXCEPTION 'quota_exceeded:stt_seconds:%:%', _used, _limit_value USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.usage_counters SET stt_seconds = stt_seconds + _amount, updated_at = now()
      WHERE user_id = _user_id AND period_start = _period
      RETURNING stt_seconds INTO _new_used;
  ELSIF _metric = 'tts_seconds' THEN
    SELECT tts_seconds INTO _used FROM public.usage_counters WHERE user_id = _user_id AND period_start = _period FOR UPDATE;
    IF _used + _amount > _limit_value THEN
      RAISE EXCEPTION 'quota_exceeded:tts_seconds:%:%', _used, _limit_value USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.usage_counters SET tts_seconds = tts_seconds + _amount, updated_at = now()
      WHERE user_id = _user_id AND period_start = _period
      RETURNING tts_seconds INTO _new_used;
  ELSIF _metric = 'voice_retrain' THEN
    SELECT voice_retrain INTO _used FROM public.usage_counters WHERE user_id = _user_id AND period_start = _period FOR UPDATE;
    IF _used + _amount > _limit_value THEN
      RAISE EXCEPTION 'quota_exceeded:voice_retrain:%:%', _used, _limit_value USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.usage_counters SET voice_retrain = voice_retrain + _amount, updated_at = now()
      WHERE user_id = _user_id AND period_start = _period
      RETURNING voice_retrain INTO _new_used;
  END IF;

  RETURN jsonb_build_object(
    'metric', _metric,
    'used', _new_used,
    'limit', _limit_value,
    'plan', _plan
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_consume_quota(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_consume_quota(uuid, text, integer) TO service_role;

-- =========================================================
-- 7. RPC: admin_plan_overview
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_plan_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'free_users', (
      SELECT count(*) FROM public.profiles p
      LEFT JOIN public.subscriptions s ON s.user_id = p.id
      WHERE s.user_id IS NULL OR s.plan = 'free'
        OR (s.plan = 'trial' AND COALESCE(s.premium_until, 'epoch'::timestamptz) <= now())
    ),
    'trial_users', (
      SELECT count(*) FROM public.subscriptions
      WHERE plan = 'trial' AND COALESCE(premium_until, 'epoch'::timestamptz) > now()
    ),
    'premium_users', (
      SELECT count(*) FROM public.subscriptions
      WHERE plan IN ('premium', 'founding')
         OR (plan = 'trial' AND subscription_status = 'active')
    ),
    'founding_users', (
      SELECT count(*) FROM public.subscriptions WHERE plan = 'founding'
    ),
    'active_subs', (
      SELECT count(*) FROM public.subscriptions
      WHERE subscription_status = 'active'
        AND subscription_provider IN ('stripe', 'apple', 'google')
    ),
    'cancelled_subs', (
      SELECT count(*) FROM public.subscriptions
      WHERE cancel_at_period_end = true OR subscription_status = 'cancelled'
    ),
    'expired_subs', (
      SELECT count(*) FROM public.subscriptions WHERE subscription_status = 'expired'
    ),
    'payment_failed', (
      SELECT count(*) FROM public.subscriptions
      WHERE last_payment_failed_at IS NOT NULL
        AND last_payment_failed_at > now() - interval '30 days'
    ),
    'mrr_eur', (
      SELECT count(*) * 4.99
      FROM public.subscriptions
      WHERE subscription_status = 'active'
        AND subscription_provider IN ('stripe', 'apple', 'google')
        AND (cancel_at_period_end IS NULL OR cancel_at_period_end = false)
    ),
    'inconsistent_premium', (
      -- Premium aktiv obwohl Abo abgelaufen
      SELECT count(*) FROM public.subscriptions
      WHERE COALESCE(premium_until, 'epoch'::timestamptz) > now()
        AND subscription_status = 'expired'
    )
  ) INTO _result;

  RETURN _result;
END;
$$;

-- =========================================================
-- 8. RPC: admin_list_user_usage
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_list_user_usage(
  _search text DEFAULT NULL,
  _plan text DEFAULT NULL,
  _over_limit_only boolean DEFAULT false,
  _limit integer DEFAULT 50,
  _offset integer DEFAULT 0
)
RETURNS TABLE(
  user_id uuid,
  user_name text,
  user_phone text,
  plan text,
  effective_plan text,
  subscription_status text,
  subscription_provider text,
  current_period_end timestamptz,
  cancel_at_period_end boolean,
  trial_used boolean,
  trial_end timestamptz,
  premium_until timestamptz,
  used jsonb,
  limits jsonb,
  pct_max numeric,
  total_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _safe_limit integer := LEAST(GREATEST(COALESCE(_limit, 50), 1), 200);
  _safe_offset integer := GREATEST(COALESCE(_offset, 0), 0);
  _safe_search text := NULLIF(trim(COALESCE(_search, '')), '');
  _period date := date_trunc('month', now())::date;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      p.id AS uid,
      COALESCE(NULLIF(p.display_name, ''), NULLIF(p.first_name, ''), 'Unbekannt') AS uname,
      p.phone_number AS uphone,
      COALESCE(s.plan, 'free') AS splan,
      CASE
        WHEN s.plan = 'trial' AND COALESCE(s.premium_until, 'epoch'::timestamptz) <= now() THEN 'free'
        ELSE COALESCE(s.plan, 'free')
      END AS eplan,
      s.subscription_status AS sstatus,
      s.subscription_provider AS sprovider,
      s.current_period_end AS scpe,
      COALESCE(s.cancel_at_period_end, false) AS scape,
      COALESCE(s.trial_used, false) AS strialused,
      s.trial_end AS strialend,
      s.premium_until AS spremiumuntil,
      c.voice_listen, c.ki_improve, c.translate, c.stt_seconds, c.tts_seconds, c.storage_bytes, c.voice_retrain
    FROM public.profiles p
    LEFT JOIN public.subscriptions s ON s.user_id = p.id
    LEFT JOIN public.usage_counters c ON c.user_id = p.id AND c.period_start = _period
  ),
  enriched AS (
    SELECT b.*,
      l.voice_listen AS l_voice_listen,
      l.ki_improve AS l_ki_improve,
      l.translate AS l_translate,
      l.stt_minutes * 60 AS l_stt_seconds,
      l.tts_minutes * 60 AS l_tts_seconds,
      l.storage_mb::bigint * 1024 * 1024 AS l_storage_bytes,
      l.voice_retrain AS l_voice_retrain,
      GREATEST(
        CASE WHEN l.voice_listen > 0 THEN COALESCE(b.voice_listen, 0)::numeric / l.voice_listen ELSE 0 END,
        CASE WHEN l.ki_improve > 0 THEN COALESCE(b.ki_improve, 0)::numeric / l.ki_improve ELSE 0 END,
        CASE WHEN l.translate > 0 THEN COALESCE(b.translate, 0)::numeric / l.translate ELSE 0 END,
        CASE WHEN l.stt_minutes > 0 THEN COALESCE(b.stt_seconds, 0)::numeric / (l.stt_minutes * 60) ELSE 0 END,
        CASE WHEN l.tts_minutes > 0 THEN COALESCE(b.tts_seconds, 0)::numeric / (l.tts_minutes * 60) ELSE 0 END,
        CASE WHEN l.storage_mb > 0 THEN COALESCE(b.storage_bytes, 0)::numeric / (l.storage_mb::numeric * 1024 * 1024) ELSE 0 END
      ) AS pct
    FROM base b
    JOIN public.usage_limits l ON l.plan = b.eplan
  ),
  filtered AS (
    SELECT *,
      count(*) OVER() AS matched
    FROM enriched
    WHERE (_plan IS NULL OR splan = _plan)
      AND (NOT _over_limit_only OR pct >= 0.8)
      AND (_safe_search IS NULL
           OR uname ILIKE '%' || _safe_search || '%'
           OR uphone ILIKE '%' || _safe_search || '%')
  )
  SELECT
    f.uid, f.uname, f.uphone, f.splan, f.eplan, f.sstatus, f.sprovider,
    f.scpe, f.scape, f.strialused, f.strialend, f.spremiumuntil,
    jsonb_build_object(
      'voice_listen', COALESCE(f.voice_listen, 0),
      'ki_improve', COALESCE(f.ki_improve, 0),
      'translate', COALESCE(f.translate, 0),
      'stt_seconds', COALESCE(f.stt_seconds, 0),
      'tts_seconds', COALESCE(f.tts_seconds, 0),
      'storage_bytes', COALESCE(f.storage_bytes, 0),
      'voice_retrain', COALESCE(f.voice_retrain, 0)
    ),
    jsonb_build_object(
      'voice_listen', f.l_voice_listen,
      'ki_improve', f.l_ki_improve,
      'translate', f.l_translate,
      'stt_seconds', f.l_stt_seconds,
      'tts_seconds', f.l_tts_seconds,
      'storage_bytes', f.l_storage_bytes,
      'voice_retrain', f.l_voice_retrain
    ),
    f.pct,
    f.matched
  FROM filtered f
  ORDER BY f.pct DESC, f.uname ASC
  LIMIT _safe_limit OFFSET _safe_offset;
END;
$$;