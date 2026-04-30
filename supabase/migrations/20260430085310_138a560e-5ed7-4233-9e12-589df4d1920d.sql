-- ============================================================
-- 1. Drop outdated overloads of log_app_error_report
-- Keep only the version with all parameters incl. _category
-- ============================================================
DROP FUNCTION IF EXISTS public.log_app_error_report(text, text, text, jsonb, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.log_app_error_report(text, text, text, jsonb, text, text, text, text, text, integer);

-- ============================================================
-- 2. Drop outdated overloads of list_app_error_reports
-- Keep only the most recent version with route/source/from/to filters
-- ============================================================
DROP FUNCTION IF EXISTS public.list_app_error_reports(text, text, text, integer, integer);
DROP FUNCTION IF EXISTS public.list_app_error_reports(text, text, text, integer, integer, text);

-- ============================================================
-- 3. Defensive: revoke any PUBLIC/anon EXECUTE on SECURITY DEFINER functions
-- ============================================================
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
                   r.proname, r.args);
  END LOOP;
END $$;

-- ============================================================
-- 4. Trigger-only functions: revoke from authenticated as well.
-- These are called by triggers (run as table owner / via SECURITY DEFINER context),
-- never directly from clients.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.notify_new_message() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admin_on_report() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_chat_invitation() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_subscription() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_call_identity_fields() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_message_update_scope() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_profile_phone_normalized() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_app_error_reports_timestamp() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_app_settings_timestamp() FROM authenticated;

-- ============================================================
-- 5. Email/queue functions: service_role only
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;