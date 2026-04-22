-- Tighten app_settings SELECT policy: anon can only read whitelisted public keys
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;

-- Anon + authenticated can only read explicitly public keys (launch_mode)
CREATE POLICY "Public can read launch_mode only"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (key = 'launch_mode');

-- Admins can read every setting (for the admin dashboard)
CREATE POLICY "Admins can read all app settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Make tts-cache bucket access intent explicit: deny all client roles.
-- The bucket is only accessed via the service_role key inside the
-- `voice-tts-stream` edge function. Service role bypasses RLS, so these
-- explicit denies do not affect server-side caching.
DROP POLICY IF EXISTS "Deny client read on tts-cache" ON storage.objects;
DROP POLICY IF EXISTS "Deny client write on tts-cache" ON storage.objects;
DROP POLICY IF EXISTS "Deny client update on tts-cache" ON storage.objects;
DROP POLICY IF EXISTS "Deny client delete on tts-cache" ON storage.objects;

CREATE POLICY "Deny client read on tts-cache"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'tts-cache' AND false);

CREATE POLICY "Deny client write on tts-cache"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'tts-cache' AND false);

CREATE POLICY "Deny client update on tts-cache"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'tts-cache' AND false)
WITH CHECK (bucket_id = 'tts-cache' AND false);

CREATE POLICY "Deny client delete on tts-cache"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id = 'tts-cache' AND false);