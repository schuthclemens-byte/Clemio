-- Create a security definer function to check conversation membership
-- This avoids recursive RLS on conversation_members
CREATE OR REPLACE FUNCTION public.is_conversation_member(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = _conversation_id
    AND user_id = _user_id
  )
$$;

-- Fix conversation_members SELECT policy (was causing infinite recursion)
DROP POLICY IF EXISTS "Members can read membership" ON public.conversation_members;

CREATE POLICY "Members can read membership"
ON public.conversation_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR is_conversation_member(conversation_id, auth.uid())
);

-- Also fix conversations policies to use the function
DROP POLICY IF EXISTS "Members can read conversations" ON public.conversations;
DROP POLICY IF EXISTS "Members can update conversations" ON public.conversations;

CREATE POLICY "Members can read conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (is_conversation_member(id, auth.uid()));

CREATE POLICY "Members can update conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (is_conversation_member(id, auth.uid()));

-- Fix messages policies to use the function too
DROP POLICY IF EXISTS "Members can read messages" ON public.messages;
DROP POLICY IF EXISTS "Members can send messages" ON public.messages;
DROP POLICY IF EXISTS "Members can update message read status" ON public.messages;

CREATE POLICY "Members can read messages"
ON public.messages
FOR SELECT
TO authenticated
USING (is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Members can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND is_conversation_member(conversation_id, auth.uid())
);

CREATE POLICY "Members can update message read status"
ON public.messages
FOR UPDATE
TO authenticated
USING (is_conversation_member(conversation_id, auth.uid()))
WITH CHECK (is_conversation_member(conversation_id, auth.uid()));