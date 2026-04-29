CREATE INDEX IF NOT EXISTS idx_app_error_reports_route_last_seen
ON public.app_error_reports (route, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_error_reports_last_seen
ON public.app_error_reports (last_seen_at DESC);

CREATE OR REPLACE FUNCTION public.list_app_error_reports(
  _status text DEFAULT NULL::text,
  _severity text DEFAULT NULL::text,
  _search text DEFAULT NULL::text,
  _limit integer DEFAULT 50,
  _offset integer DEFAULT 0,
  _category text DEFAULT NULL::text,
  _route text DEFAULT NULL::text,
  _source text DEFAULT NULL::text,
  _from timestamptz DEFAULT NULL::timestamptz,
  _to timestamptz DEFAULT NULL::timestamptz
)
RETURNS TABLE(id uuid, user_id uuid, title text, message text, stack text, details jsonb, route text, user_agent text, platform text, severity text, status text, admin_note text, fingerprint text, occurrences integer, created_at timestamp with time zone, updated_at timestamp with time zone, last_seen_at timestamp with time zone, user_name text, user_phone text, category text, total_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _safe_limit integer := LEAST(GREATEST(COALESCE(_limit, 50), 1), 100);
  _safe_offset integer := GREATEST(COALESCE(_offset, 0), 0);
  _safe_search text := NULLIF(trim(COALESCE(_search, '')), '');
  _safe_route text := NULLIF(trim(COALESCE(_route, '')), '');
  _safe_source text := NULLIF(trim(COALESCE(_source, '')), '');
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

  IF _from IS NOT NULL AND _to IS NOT NULL AND _from > _to THEN
    RAISE EXCEPTION 'invalid_period' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      e.*,
      COALESCE(NULLIF(p.display_name, ''), NULLIF(p.first_name, ''), 'Unknown') AS resolved_user_name,
      p.phone_number AS resolved_user_phone,
      count(*) OVER() AS matched_count
    FROM public.app_error_reports e
    LEFT JOIN public.profiles p ON p.id = e.user_id
    WHERE (_status IS NULL OR e.status = _status)
      AND (_severity IS NULL OR e.severity = _severity)
      AND (_category IS NULL OR e.category = _category)
      AND (_from IS NULL OR e.last_seen_at >= _from)
      AND (_to IS NULL OR e.last_seen_at <= _to)
      AND (_safe_route IS NULL OR e.route ILIKE '%' || _safe_route || '%')
      AND (_safe_source IS NULL OR e.details->>'source' ILIKE '%' || _safe_source || '%')
      AND (
        _safe_search IS NULL
        OR e.title ILIKE '%' || _safe_search || '%'
        OR e.message ILIKE '%' || _safe_search || '%'
        OR e.route ILIKE '%' || _safe_search || '%'
        OR e.details->>'source' ILIKE '%' || _safe_search || '%'
      )
  )
  SELECT
    f.id,
    f.user_id,
    f.title,
    f.message,
    f.stack,
    f.details,
    f.route,
    f.user_agent,
    f.platform,
    f.severity,
    f.status,
    f.admin_note,
    f.fingerprint,
    f.occurrences,
    f.created_at,
    f.updated_at,
    f.last_seen_at,
    f.resolved_user_name AS user_name,
    f.resolved_user_phone AS user_phone,
    f.category,
    f.matched_count AS total_count
  FROM filtered f
  ORDER BY f.last_seen_at DESC
  LIMIT _safe_limit
  OFFSET _safe_offset;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.list_app_error_reports(text, text, text, integer, integer, text, text, text, timestamptz, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_app_error_reports(text, text, text, integer, integer, text, text, text, timestamptz, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.list_app_error_reports(text, text, text, integer, integer, text, text, text, timestamptz, timestamptz) TO authenticated;