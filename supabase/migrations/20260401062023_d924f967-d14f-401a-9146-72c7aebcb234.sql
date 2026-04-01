
-- Allow consented users to read voice samples of the voice owner
CREATE POLICY "Consented users can read voice samples"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'voice-samples'
  AND EXISTS (
    SELECT 1 FROM public.voice_consents vc
    WHERE vc.voice_owner_id = ((storage.foldername(name))[1])::uuid
      AND vc.granted_to_user_id = auth.uid()
      AND vc.status = 'granted'
  )
);
