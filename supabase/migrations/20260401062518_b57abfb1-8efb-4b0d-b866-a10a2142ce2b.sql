
CREATE POLICY "Owners can delete voice samples"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'voice-samples'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
