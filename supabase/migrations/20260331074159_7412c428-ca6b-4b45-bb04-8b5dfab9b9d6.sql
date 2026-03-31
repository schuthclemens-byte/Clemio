-- Add UPDATE policy for voice-samples bucket so owners can update their files
CREATE POLICY "Owners can update voice samples" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'voice-samples'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'voice-samples'
  AND (storage.foldername(name))[1] = auth.uid()::text
);