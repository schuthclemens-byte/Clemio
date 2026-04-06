
-- Update DELETE policy: only allow deletion within 15 minutes AND if message is unread
DROP POLICY IF EXISTS "Members can delete own messages" ON public.messages;

CREATE POLICY "Members can delete own messages"
ON public.messages
FOR DELETE
TO authenticated
USING (
  auth.uid() = sender_id
  AND is_conversation_member(conversation_id, auth.uid())
  AND created_at > (now() - interval '15 minutes')
  AND is_read = false
);

-- Update UPDATE policy: only allow editing within 15 minutes AND if message is unread
DROP POLICY IF EXISTS "Sender can edit own messages" ON public.messages;

CREATE POLICY "Sender can edit own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  auth.uid() = sender_id
  AND is_conversation_member(conversation_id, auth.uid())
  AND created_at > (now() - interval '15 minutes')
  AND is_read = false
)
WITH CHECK (
  auth.uid() = sender_id
  AND is_conversation_member(conversation_id, auth.uid())
);
