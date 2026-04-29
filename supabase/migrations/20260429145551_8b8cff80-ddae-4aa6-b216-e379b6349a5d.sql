ALTER TABLE public.app_error_reports
ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'ui';

ALTER TABLE public.app_error_reports
DROP CONSTRAINT IF EXISTS app_error_reports_category_check;

ALTER TABLE public.app_error_reports
ADD CONSTRAINT app_error_reports_category_check
CHECK (category IN ('ui', 'api', 'realtime', 'storage', 'auth', 'push', 'voice', 'unknown'));

CREATE INDEX IF NOT EXISTS idx_app_error_reports_category_last_seen
ON public.app_error_reports (category, last_seen_at DESC);

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
    fingerprint,
    category
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

REVOKE EXECUTE ON FUNCTION public.log_app_error_report(text, text, text, jsonb, text, text, text, text, text, integer, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_app_error_report(text, text, text, jsonb, text, text, text, text, text, integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_app_error_report(text, text, text, jsonb, text, text, text, text, text, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_app_error_reports(
  _status text DEFAULT NULL::text,
  _severity text DEFAULT NULL::text,
  _search text DEFAULT NULL::text,
  _limit integer DEFAULT 50,
  _offset integer DEFAULT 0,
  _category text DEFAULT NULL::text
)
RETURNS TABLE(id uuid, user_id uuid, title text, message text, stack text, details jsonb, route text, user_agent text, platform text, severity text, status text, admin_note text, fingerprint text, occurrences integer, created_at timestamp with time zone, updated_at timestamp with time zone, last_seen_at timestamp with time zone, user_name text, user_phone text, category text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _safe_limit integer := LEAST(GREATEST(COALESCE(_limit, 50), 1), 100);
  _safe_offset integer := GREATEST(COALESCE(_offset, 0), 0);
  _safe_search text := NULLIF(trim(COALESCE(_search, '')), '');
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF _status IS NOT NULL AND _status NOT IN ('open', 'reviewed', 'resolved') THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE = 'P0001';
  END IF;

  IF _severity IS NOT NULL AND _severity NOT IN ('warning', 'error', 'fatal') THEN
    RAISE EXCEPTION 'invalid_severity' USING ERRCODE = 'P0001';
  END IF;

  IF _category IS NOT NULL AND _category NOT IN ('ui', 'api', 'realtime', 'storage', 'auth', 'push', 'voice', 'unknown') THEN
    RAISE EXCEPTION 'invalid_category' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.user_id,
    e.title,
    e.message,
    e.stack,
    e.details,
    e.route,
    e.user_agent,
    e.platform,
    e.severity,
    e.status,
    e.admin_note,
    e.fingerprint,
    e.occurrences,
    e.created_at,
    e.updated_at,
    e.last_seen_at,
    COALESCE(NULLIF(p.display_name, ''), NULLIF(p.first_name, ''), 'Unknown') AS user_name,
    p.phone_number AS user_phone,
    e.category
  FROM public.app_error_reports e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  WHERE (_status IS NULL OR e.status = _status)
    AND (_severity IS NULL OR e.severity = _severity)
    AND (_category IS NULL OR e.category = _category)
    AND (
      _safe_search IS NULL
      OR e.title ILIKE '%' || _safe_search || '%'
      OR e.message ILIKE '%' || _safe_search || '%'
    )
  ORDER BY e.last_seen_at DESC
  LIMIT _safe_limit
  OFFSET _safe_offset;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.list_app_error_reports(text, text, text, integer, integer, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_app_error_reports(text, text, text, integer, integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.list_app_error_reports(text, text, text, integer, integer, text) TO authenticated;