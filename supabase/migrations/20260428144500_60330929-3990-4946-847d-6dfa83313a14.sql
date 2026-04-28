ALTER TABLE public.app_error_reports
ADD CONSTRAINT app_error_reports_user_fingerprint_unique UNIQUE (user_id, fingerprint);

CREATE OR REPLACE FUNCTION public.log_app_error_report(
  _title text,
  _message text,
  _stack text DEFAULT NULL,
  _details jsonb DEFAULT '{}'::jsonb,
  _route text DEFAULT NULL,
  _user_agent text DEFAULT NULL,
  _platform text DEFAULT NULL,
  _severity text DEFAULT 'error',
  _fingerprint text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _id uuid;
  _safe_severity text := CASE WHEN _severity IN ('warning', 'error', 'fatal') THEN _severity ELSE 'error' END;
  _safe_fingerprint text := left(COALESCE(NULLIF(_fingerprint, ''), COALESCE(_title, '') || '|' || COALESCE(_message, '') || '|' || COALESCE(_route, '')), 500);
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
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
$$;

REVOKE ALL ON FUNCTION public.log_app_error_report(text, text, text, jsonb, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_app_error_report(text, text, text, jsonb, text, text, text, text, text) TO authenticated;