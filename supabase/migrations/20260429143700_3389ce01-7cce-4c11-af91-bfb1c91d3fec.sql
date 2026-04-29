CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  target_user_id uuid NULL,
  target_resource text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  success boolean NOT NULL DEFAULT true,
  error_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read admin audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can read admin audit log"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Service role can write admin audit log" ON public.admin_audit_log;
CREATE POLICY "Service role can write admin audit log"
ON public.admin_audit_log
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_created_at
ON public.admin_audit_log (admin_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action_created_at
ON public.admin_audit_log (action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_error_reports_severity_last_seen
ON public.app_error_reports (severity, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_error_reports_status_severity_last_seen
ON public.app_error_reports (status, severity, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_error_reports_title_message_trgm
ON public.app_error_reports USING gin ((title || ' ' || message) extensions.gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
$function$;

CREATE OR REPLACE FUNCTION public.list_app_error_reports(
  _status text DEFAULT NULL,
  _severity text DEFAULT NULL,
  _search text DEFAULT NULL,
  _limit integer DEFAULT 50,
  _offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  title text,
  message text,
  stack text,
  details jsonb,
  route text,
  user_agent text,
  platform text,
  severity text,
  status text,
  admin_note text,
  fingerprint text,
  occurrences integer,
  created_at timestamptz,
  updated_at timestamptz,
  last_seen_at timestamptz,
  user_name text,
  user_phone text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
    p.phone_number AS user_phone
  FROM public.app_error_reports e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  WHERE (_status IS NULL OR e.status = _status)
    AND (_severity IS NULL OR e.severity = _severity)
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

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_conversation_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_blocked_profiles() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_current_profile(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_messages_read(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_call_identity_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_chat_invitation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.search_profiles_by_query(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decline_message_request(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_app_error_report(text, text, text, jsonb, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_subscription() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_accessible_profiles(uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_contact_form(text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_security_email(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_voice_consent(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_direct_chat(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_accessible_voice_profile_states(uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.match_contacts_by_phone(text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_message_update_scope() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_admin_on_report() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.accept_message_request(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.block_message_request(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_new_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_message_request_preview(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_app_error_reports(text, text, text, integer, integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_blocked_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_current_profile(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_messages_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_profiles_by_query(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_message_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_app_error_report(text, text, text, jsonb, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accessible_profiles(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_security_email(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_voice_consent(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_direct_chat(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accessible_voice_profile_states(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_contacts_by_phone(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_message_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.block_message_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_message_request_preview(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_app_error_reports(text, text, text, integer, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.submit_contact_form(text, text, text, text, text) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;