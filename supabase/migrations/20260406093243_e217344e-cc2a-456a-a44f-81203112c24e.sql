
DROP POLICY IF EXISTS "Sender can edit own messages" ON public.messages;

CREATE POLICY "Sender can edit own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id AND is_conversation_member(conversation_id, auth.uid()))
WITH CHECK (auth.uid() = sender_id AND is_conversation_member(conversation_id, auth.uid()));
