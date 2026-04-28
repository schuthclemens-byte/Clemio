CREATE TABLE public.app_error_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  stack text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  route text,
  user_agent text,
  platform text,
  severity text NOT NULL DEFAULT 'error',
  status text NOT NULL DEFAULT 'open',
  admin_note text,
  fingerprint text NOT NULL,
  occurrences integer NOT NULL DEFAULT 1,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_error_reports_severity_check CHECK (severity IN ('warning', 'error', 'fatal')),
  CONSTRAINT app_error_reports_status_check CHECK (status IN ('open', 'reviewed', 'resolved'))
);

ALTER TABLE public.app_error_reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_app_error_reports_status_created_at ON public.app_error_reports (status, created_at DESC);
CREATE INDEX idx_app_error_reports_user_id ON public.app_error_reports (user_id);
CREATE INDEX idx_app_error_reports_fingerprint_user_id ON public.app_error_reports (fingerprint, user_id);

CREATE POLICY "Users can create own app error reports"
ON public.app_error_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own app error reports"
ON public.app_error_reports
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all app error reports"
ON public.app_error_reports
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update app error reports"
ON public.app_error_reports
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete app error reports"
ON public.app_error_reports
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.update_app_error_reports_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_app_error_reports_updated_at
BEFORE UPDATE ON public.app_error_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_app_error_reports_timestamp();

ALTER TABLE public.app_error_reports REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_error_reports;