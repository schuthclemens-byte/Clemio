-- Tighten INSERT policy on chat-media so users can only upload to conversation
-- folders they are members of. Files without a conversation segment (e.g. backgrounds)
-- are still allowed under the user's own folder.
DROP POLICY IF EXISTS "Users can upload own chat media" ON storage.objects;

CREATE POLICY "Users can upload own chat media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (
    -- No conversation segment OR segment is not a UUID (e.g. bg-... files)
    (storage.foldername(name))[2] IS NULL
    OR (storage.foldername(name))[2] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    -- OR conversation UUID is one the user belongs to
    OR is_conversation_member(((storage.foldername(name))[2])::uuid, auth.uid())
  )
);