-- Fix: chat-media SELECT policy was too broad — any co-member of ANY shared
-- conversation could read all chat media files of an uploader, including
-- files from unrelated private conversations.
--
-- New rule: a non-owner may only read a chat-media file when they are a
-- member of the EXACT conversation the file was uploaded to. The
-- conversation_id is the second path segment in our upload convention
-- (`{owner_id}/{conversation_id}/{filename}`). Files without a uuid in
-- the second segment (e.g. user backgrounds at `{owner_id}/bg-*.jpg`)
-- remain owner-only.

DROP POLICY IF EXISTS "Members can read chat media" ON storage.objects;

CREATE POLICY "Members can read chat media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND (
    -- Owner can always read their own files.
    (storage.foldername(name))[1] = auth.uid()::text
    OR (
      -- Otherwise: file path must contain a conversation_id as the
      -- second segment, and the requester must be a member of THAT
      -- conversation specifically.
      (storage.foldername(name))[2] IS NOT NULL
      AND (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND public.is_conversation_member(
        ((storage.foldername(name))[2])::uuid,
        auth.uid()
      )
    )
  )
);