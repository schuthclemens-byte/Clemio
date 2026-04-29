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
  _dedupe_window_seconds integer DEFAULT 1800
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
  _safe_fingerprint text := left(COALESCE(NULLIF(_fingerprint, ''), COALESCE(_title, '') || '|' || COALESCE(_message, '') || '|' || COALESCE(_route, '')), 500);
  _safe_window interval := make_interval(secs => LEAST(GREATEST(COALESCE(_dedupe_window_seconds, 1800), 60), 86400));
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT id, last_seen_at
  INTO _id, _existing_last_seen
  FROM public.app_error_reports
  WHERE user_id = _user_id
    AND fingerprint = _safe_fingerprint;

  IF _id IS NOT NULL AND _existing_last_seen > now() - _safe_window THEN
    RETURN _id;
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
    fingerprint
  ) VALUES (
    _user_id,
    left(COALESCE(NULLIF(_title, ''), 'Unbekannter Fehler'), 180),
    left(COALESCE(_message, _title, 'Unbekannter Fehler'), 2000),
    CASE WHEN _stack IS NULL THEN NULL ELSE left(_stack, 8000) END,
    COALESCE(_details, '{}'::jsonb),
    left(COALESCE(_route, ''), 500),
    left(COALESCE(_user_agent, ''), 500),
    left(COALESCE(_platform, ''), 120),
    _safe_severity,
    _safe_fingerprint
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
    status = 'open',
    occurrences = public.app_error_reports.occurrences + 1,
    last_seen_at = now(),
    updated_at = now()
  RETURNING id INTO _id;

  RETURN _id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.log_app_error_report(text, text, text, jsonb, text, text, text, text, text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_app_error_report(text, text, text, jsonb, text, text, text, text, text, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_app_error_report(text, text, text, jsonb, text, text, text, text, text, integer) TO authenticated;