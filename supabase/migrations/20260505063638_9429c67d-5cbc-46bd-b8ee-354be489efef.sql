DROP POLICY IF EXISTS "Public read access for active avatars" ON storage.objects;

CREATE POLICY "Public read access for active avatars"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'avatars'
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.avatar_url = storage.objects.name
       OR p.avatar_url LIKE '%/avatars/' || storage.objects.name
  )
);