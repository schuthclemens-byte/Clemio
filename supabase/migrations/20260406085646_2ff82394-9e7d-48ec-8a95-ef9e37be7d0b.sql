CREATE TABLE public.app_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL DEFAULT 'android',
  version text NOT NULL,
  force_update boolean NOT NULL DEFAULT false,
  changelog text,
  store_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app versions"
ON public.app_versions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role manages app versions"
ON public.app_versions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);