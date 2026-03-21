DROP POLICY IF EXISTS "Members can read conversations" ON public.conversations;
DROP POLICY IF EXISTS "Members can update conversations" ON public.conversations;

CREATE POLICY "Members can read conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_members.conversation_id = conversations.id
    AND conversation_members.user_id = auth.uid()
  )
);

CREATE POLICY "Members can update conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_members.conversation_id = conversations.id
    AND conversation_members.user_id = auth.uid()
  )
);