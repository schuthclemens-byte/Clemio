
-- Drop the overly permissive read policy
DROP POLICY IF EXISTS "Authenticated users can read chat media" ON storage.objects;

-- Create scoped read policy: user can read own uploads OR files from conversation partners
CREATE POLICY "Members can read chat media" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-media'
  AND (
    -- Own files
    (storage.foldername(name))[1] = auth.uid()::text
    -- Files from users who share a conversation with the requester
    OR EXISTS (
      SELECT 1
      FROM public.conversation_members cm1
      JOIN public.conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
      WHERE cm1.user_id = auth.uid()
        AND cm2.user_id = ((storage.foldername(name))[1])::uuid
    )
  )
);
