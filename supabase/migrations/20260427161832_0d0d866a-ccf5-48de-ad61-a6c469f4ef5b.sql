CREATE POLICY "Authenticated users can read call captions setting"
ON public.app_settings
FOR SELECT
TO authenticated
USING (key = 'call_captions');

INSERT INTO public.app_settings (key, value)
VALUES ('call_captions', '{"enabled": false, "native_only": true, "translation_enabled": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;