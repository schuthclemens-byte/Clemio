-- Create app_settings table for global app configuration
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon) can read settings — landing page needs this
CREATE POLICY "Anyone can read app settings"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert app settings"
ON public.app_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update
CREATE POLICY "Admins can update app settings"
ON public.app_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "Admins can delete app settings"
ON public.app_settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.update_app_settings_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_app_settings_timestamp();

-- Seed initial launch_mode entry (Coming Soon active by default)
INSERT INTO public.app_settings (key, value)
VALUES ('launch_mode', '{"coming_soon": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Enable realtime
ALTER TABLE public.app_settings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;