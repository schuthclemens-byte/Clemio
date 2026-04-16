CREATE POLICY "Users can upload own voice samples"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-samples'
  AND (storage.foldername(name))[1] = auth.uid()::text
);