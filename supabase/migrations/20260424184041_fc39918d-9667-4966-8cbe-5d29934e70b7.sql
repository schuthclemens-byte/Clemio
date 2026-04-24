-- =====================================================
-- 1. Contact submissions table
-- =====================================================
CREATE TABLE public.contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  ip_address TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT contact_submissions_category_check CHECK (category IN ('bug', 'feedback', 'question', 'business', 'other')),
  CONSTRAINT contact_submissions_status_check CHECK (status IN ('new', 'in_progress', 'resolved', 'spam')),
  CONSTRAINT contact_submissions_name_length CHECK (char_length(name) BETWEEN 2 AND 100),
  CONSTRAINT contact_submissions_email_length CHECK (char_length(email) BETWEEN 5 AND 255),
  CONSTRAINT contact_submissions_message_length CHECK (char_length(message) BETWEEN 10 AND 2000)
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Index for admin filtering
CREATE INDEX idx_contact_submissions_status_created ON public.contact_submissions(status, created_at DESC);
CREATE INDEX idx_contact_submissions_ip_created ON public.contact_submissions(ip_address, created_at DESC);

-- Only admins can view/update — public submission goes through SECURITY DEFINER RPC
CREATE POLICY "Admins can view all contact submissions"
ON public.contact_submissions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update contact submissions"
ON public.contact_submissions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete contact submissions"
ON public.contact_submissions FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER trg_contact_submissions_updated_at
BEFORE UPDATE ON public.contact_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_app_settings_timestamp();

-- =====================================================
-- 2. Submit contact form RPC (SECURITY DEFINER, with rate limit)
-- =====================================================
CREATE OR REPLACE FUNCTION public.submit_contact_form(
  _name TEXT,
  _email TEXT,
  _category TEXT,
  _message TEXT,
  _ip_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_id UUID;
  _recent_count INT;
  _email_lower TEXT := lower(trim(_email));
  _name_trimmed TEXT := trim(_name);
  _msg_trimmed TEXT := trim(_message);
BEGIN
  -- Server-side validation
  IF _name_trimmed IS NULL OR char_length(_name_trimmed) < 2 OR char_length(_name_trimmed) > 100 THEN
    RAISE EXCEPTION 'invalid_name' USING ERRCODE = 'P0001';
  END IF;

  IF _email_lower IS NULL OR _email_lower !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR char_length(_email_lower) > 255 THEN
    RAISE EXCEPTION 'invalid_email' USING ERRCODE = 'P0001';
  END IF;

  IF _category NOT IN ('bug', 'feedback', 'question', 'business', 'other') THEN
    RAISE EXCEPTION 'invalid_category' USING ERRCODE = 'P0001';
  END IF;

  IF _msg_trimmed IS NULL OR char_length(_msg_trimmed) < 10 OR char_length(_msg_trimmed) > 2000 THEN
    RAISE EXCEPTION 'invalid_message' USING ERRCODE = 'P0001';
  END IF;

  -- Rate limit: max 3 per IP per hour
  IF _ip_address IS NOT NULL THEN
    SELECT count(*) INTO _recent_count
    FROM public.contact_submissions
    WHERE ip_address = _ip_address
      AND created_at > now() - interval '1 hour';

    IF _recent_count >= 3 THEN
      RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Rate limit per email: max 5 per day
  SELECT count(*) INTO _recent_count
  FROM public.contact_submissions
  WHERE lower(email) = _email_lower
    AND created_at > now() - interval '24 hours';

  IF _recent_count >= 5 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.contact_submissions (name, email, category, message, ip_address)
  VALUES (_name_trimmed, _email_lower, _category, _msg_trimmed, _ip_address)
  RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_contact_form(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- =====================================================
-- 3. Report notification trigger (with spam protection)
-- =====================================================
CREATE TABLE public.report_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  reported_user_id UUID,
  notified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_notif_log_lookup
ON public.report_notification_log(reporter_id, reported_user_id, notified_at DESC);

ALTER TABLE public.report_notification_log ENABLE ROW LEVEL SECURITY;

-- Admins read
CREATE POLICY "Admins can view notification log"
ON public.report_notification_log FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

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
  WHERE reporter_id = NEW.reporter_id
    AND COALESCE(reported_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
        = COALESCE(NEW.reported_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND notified_at > now() - interval '5 minutes';

  IF _recent_notif > 0 THEN
    RETURN NEW;
  END IF;

  -- Log notification
  INSERT INTO public.report_notification_log (reporter_id, reported_user_id)
  VALUES (NEW.reporter_id, NEW.reported_user_id);

  -- Build payload
  _payload := jsonb_build_object(
    'report_id', NEW.id,
    'report_type', NEW.report_type,
    'reason', NEW.reason,
    'reporter_id', NEW.reporter_id,
    'reported_user_id', NEW.reported_user_id,
    'created_at', NEW.created_at
  );

  -- Fire-and-forget HTTP call to edge function
  PERFORM net.http_post(
    url := _supabase_url || '/functions/v1/notify-report',
    body := _payload,
    headers := jsonb_build_object('Content-Type', 'application/json')
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the report insert — just log and continue
  RAISE WARNING 'notify_admin_on_report failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admin_on_report
AFTER INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_on_report();