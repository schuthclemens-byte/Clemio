CREATE OR REPLACE FUNCTION public.log_app_error_report(
  _title text,
  _message text,
  _stack text DEFAULT NULL::text,
  _details jsonb DEFAULT '{}'::jsonb,
  _route text DEFAULT NULL::text,
  _user_agent text DEFAULT NULL::text,
  _platform text DEFAULT NULL::text,
  _severity text DEFAULT 'error'::text,
  _fingerprint text DEFAULT NULL::text,
  _dedupe_window_seconds integer DEFAULT 1800,
  _category text DEFAULT 'ui'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _id uuid;
  _existing_last_seen timestamptz;
  _safe_severity text := CASE WHEN _severity IN ('warning', 'error', 'fatal') THEN _severity ELSE 'error' END;
  _safe_category text := CASE WHEN _category IN ('ui', 'api', 'realtime', 'storage', 'auth', 'push', 'voice', 'unknown') THEN _category ELSE 'unknown' END;
  _safe_fingerprint text := left(COALESCE(NULLIF(_fingerprint, ''), COALESCE(_title, '') || '|' || COALESCE(_message, '') || '|' || COALESCE(_route, '')), 500);
  _safe_window interval := make_interval(secs => LEAST(GREATEST(COALESCE(_dedupe_window_seconds, 1800), 60), 86400));
  _new_fp_count integer;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Look up existing report by user+fingerprint
  SELECT id, last_seen_at
  INTO _id, _existing_last_seen
  FROM public.app_error_reports
  WHERE user_id = _user_id
    AND fingerprint = _safe_fingerprint;

  -- Dedupe: if we saw the same fingerprint within the window, skip work
  IF _id IS NOT NULL AND _existing_last_seen > now() - _safe_window THEN
    RETURN _id;
  END IF;

  -- Rate-limit only NEW fingerprints (existing fingerprints are just bumped via UPSERT)
  IF _id IS NULL THEN
    SELECT count(*) INTO _new_fp_count
    FROM public.app_error_reports
    WHERE user_id = _user_id
      AND created_at > now() - interval '1 hour';

    IF _new_fp_count >= 50 THEN
      -- Silently drop: do not raise, do not insert.
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO public.app_error_reports (
    user_id,
    title,
    message,
    stack,
    details,
    route,
    user_agent,
    platform,
    severity,
    fingerprint,
    category
  ) VALUES (
    _user_id,
    left(COALESCE(NULLIF(_title, ''), 'Unbekannter Fehler'), 180),
    left(COALESCE(_message, _title, 'Unbekannter Fehler'), 2000),
    CASE WHEN _stack IS NULL THEN NULL ELSE left(_stack, 4000) END,
    COALESCE(_details, '{}'::jsonb),
    left(COALESCE(_route, ''), 500),
    left(COALESCE(_user_agent, ''), 500),
    left(COALESCE(_platform, ''), 120),
    _safe_severity,
    _safe_fingerprint,
    _safe_category
  )
  ON CONFLICT (user_id, fingerprint)
  DO UPDATE SET
    title = EXCLUDED.title,
    message = EXCLUDED.message,
    stack = EXCLUDED.stack,
    details = EXCLUDED.details,
    route = EXCLUDED.route,
    user_agent = EXCLUDED.user_agent,
    platform = EXCLUDED.platform,
    severity = EXCLUDED.severity,
    category = EXCLUDED.category,
    status = 'open',
    occurrences = public.app_error_reports.occurrences + 1,
    last_seen_at = now(),
    updated_at = now()
  RETURNING id INTO _id;

  RETURN _id;
END;
$function$;

-- Re-apply hardened permissions to the recreated function
REVOKE EXECUTE ON FUNCTION public.log_app_error_report(text, text, text, jsonb, text, text, text, text, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_app_error_report(text, text, text, jsonb, text, text, text, text, text, integer, text) TO authenticated;