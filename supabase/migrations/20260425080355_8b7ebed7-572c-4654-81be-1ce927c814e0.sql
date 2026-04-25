DROP POLICY IF EXISTS "Public read access for downloads" ON storage.objects;
DROP POLICY IF EXISTS "Public avatar read access" ON storage.objects;

CREATE POLICY "Public read access for known downloads"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'downloads'
  AND name IN ('clemio.apk', 'clemio-setup.zip')
);

CREATE POLICY "Public read access for active avatars"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'avatars'
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.avatar_url IS NOT NULL
      AND p.avatar_url LIKE '%' || storage.objects.name || '%'
  )
);