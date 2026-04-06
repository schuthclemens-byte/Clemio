-- Fix downloads bucket: restrict uploads to user's own folder
DROP POLICY IF EXISTS "Authenticated users can upload to downloads" ON storage.objects;
CREATE POLICY "Users can upload to own downloads folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'downloads'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);