
REVOKE EXECUTE ON FUNCTION public.admin_list_user_usage(text, text, boolean, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_plan_overview() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_usage_summary(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_user_activity(text, text, timestamptz, timestamptz, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_activity_display_name(uuid) FROM anon;

DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname IN ('log_signup_activity','log_subscription_activity','log_voice_activity')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', fn.sig);
  END LOOP;
END$$;

CREATE TABLE IF NOT EXISTS public.internal_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.internal_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.internal_secrets FROM anon, authenticated;

INSERT INTO public.internal_secrets (key, value)
VALUES ('notify_report_secret', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.notify_admin_on_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _recent_notif INT;
  _supabase_url TEXT := 'https://zvvjgkxtgtpniashvqsl.supabase.co';
  _payload JSONB;
  _secret TEXT;
BEGIN
  SELECT count(*) INTO _recent_notif
  FROM public.report_notification_log
  WHERE reporter_id = NEW.reported_by
    AND COALESCE(reported_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(NEW.reported_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND notified_at > now() - interval '5 minutes';

  IF _recent_notif > 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.report_notification_log (reporter_id, reported_user_id)
  VALUES (NEW.reported_by, NEW.reported_user_id);

  SELECT value INTO _secret FROM public.internal_secrets WHERE key = 'notify_report_secret';

  _payload := jsonb_build_object(
    'report_id', NEW.id,
    'report_type', NEW.report_type,
    'reason', NEW.reason,
    'description', NEW.description,
    'reported_by', NEW.reported_by,
    'reported_user_id', NEW.reported_user_id,
    'message_id', NEW.message_id,
    'created_at', NEW.created_at
  );

  PERFORM net.http_post(
    url := _supabase_url || '/functions/v1/notify-report',
    body := _payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', COALESCE(_secret, '')
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_admin_on_report failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;
