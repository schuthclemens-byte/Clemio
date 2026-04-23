CREATE POLICY "Voice owners can read their own samples"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'voice-samples'
  AND (storage.foldername(name))[1] = auth.uid()::text
);