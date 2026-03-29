-- Remove the overly broad member UPDATE policy; the trigger guards it but the policy itself is too permissive.
-- Instead, use a SECURITY DEFINER RPC for marking messages read.
DROP POLICY IF EXISTS "Members can mark messages read" ON public.messages;

-- Create a secure RPC that only updates is_read
CREATE OR REPLACE FUNCTION public.mark_messages_read(_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_conversation_member(_conversation_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not a member of this conversation';
  END IF;

  UPDATE public.messages
  SET is_read = true
  WHERE conversation_id = _conversation_id
    AND sender_id <> auth.uid()
    AND is_read = false;
END;
$$;