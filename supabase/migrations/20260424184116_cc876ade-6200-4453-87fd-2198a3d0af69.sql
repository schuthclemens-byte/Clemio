-- Fix column names in trigger (reports table uses reported_by, not reporter_id)
DROP TRIGGER IF EXISTS trg_notify_admin_on_report ON public.reports;
DROP FUNCTION IF EXISTS public.notify_admin_on_report();

CREATE OR REPLACE FUNCTION public.notify_admin_on_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _recent_notif INT;
  _supabase_url TEXT := 'https://zvvjgkxtgtpniashvqsl.supabase.co';
  _payload JSONB;
BEGIN
  -- Spam protection: skip if same reporter→reported combo notified in last 5 minutes
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
    headers := jsonb_build_object('Content-Type', 'application/json')
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_admin_on_report failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admin_on_report
AFTER INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_on_report();