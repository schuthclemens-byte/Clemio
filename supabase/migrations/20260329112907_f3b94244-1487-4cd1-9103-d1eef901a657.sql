-- Fix: Remove self-join clause that allows any user to join any conversation
DROP POLICY IF EXISTS "Auth users can add members to own conversations" ON public.conversation_members;

CREATE POLICY "Only creator can add members"
ON public.conversation_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = conversation_members.conversation_id
    AND conversations.created_by = auth.uid()
  )
);