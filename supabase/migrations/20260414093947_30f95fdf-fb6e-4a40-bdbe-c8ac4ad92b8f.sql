-- Create reports table
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by uuid NOT NULL,
  reported_user_id uuid NOT NULL,
  report_type text NOT NULL DEFAULT 'user',
  reason text NOT NULL DEFAULT 'other',
  description text,
  message_id uuid,
  status text NOT NULL DEFAULT 'open',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reports_report_type_check CHECK (report_type IN ('message', 'voice', 'user')),
  CONSTRAINT reports_reason_check CHECK (reason IN ('abuse', 'wrong_voice', 'spam', 'other')),
  CONSTRAINT reports_status_check CHECK (status IN ('open', 'reviewed', 'resolved'))
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports"
ON public.reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reported_by);

-- Users can read own reports
CREATE POLICY "Users can read own reports"
ON public.reports FOR SELECT
TO authenticated
USING (auth.uid() = reported_by);

-- Admins can read all reports
CREATE POLICY "Admins can read all reports"
ON public.reports FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update reports (status, admin_note)
CREATE POLICY "Admins can update reports"
ON public.reports FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete reports
CREATE POLICY "Admins can delete reports"
ON public.reports FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));