-- Add explicit UPDATE policy on chat-media storage bucket (owner only)
CREATE POLICY "Users can update own chat media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = (auth.uid())::text)
WITH CHECK (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = (auth.uid())::text);

-- Restrict conversation_members INSERT to group conversations or self-add
-- Drop old policy and replace with stricter version
DROP POLICY IF EXISTS "Only creator can add members" ON public.conversation_members;

CREATE POLICY "Only creator can add members"
ON public.conversation_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_members.conversation_id
      AND c.created_by = auth.uid()
      AND (
        c.is_group = true
        OR conversation_members.user_id = auth.uid()
        OR (
          SELECT COUNT(*) FROM public.conversation_members cm
          WHERE cm.conversation_id = c.id
        ) < 2
      )
  )
);