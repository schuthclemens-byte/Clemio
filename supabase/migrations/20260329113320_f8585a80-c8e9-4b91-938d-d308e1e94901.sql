-- 1) Fix message update tampering: split into sender-only content edit + member read-status update
DROP POLICY IF EXISTS "Members can update message read status" ON public.messages;

-- Sender can update their own message content
CREATE POLICY "Sender can edit own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- Any conversation member can mark messages as read (restricted via trigger)
CREATE POLICY "Members can mark messages read"
ON public.messages
FOR UPDATE
TO authenticated
USING (is_conversation_member(conversation_id, auth.uid()))
WITH CHECK (is_conversation_member(conversation_id, auth.uid()));

-- Trigger to prevent non-senders from changing anything except is_read
CREATE OR REPLACE FUNCTION public.enforce_message_update_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If the updater is the sender, allow all changes
  IF OLD.sender_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  -- Non-sender: only is_read may change
  IF NEW.content IS DISTINCT FROM OLD.content
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.message_type IS DISTINCT FROM OLD.message_type
     OR NEW.reply_to IS DISTINCT FROM OLD.reply_to
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'You can only update is_read on messages you did not send';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_message_update_scope ON public.messages;
CREATE TRIGGER trg_enforce_message_update_scope
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_message_update_scope();

-- 2) Allow conversation members to leave (self-delete) and creators to remove anyone
DROP POLICY IF EXISTS "Members can delete own membership" ON public.conversation_members;

CREATE POLICY "Members can leave or creator can remove"
ON public.conversation_members
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = conversation_members.conversation_id
    AND conversations.created_by = auth.uid()
  )
);