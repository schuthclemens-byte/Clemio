
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at timestamptz DEFAULT NULL;

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
  SET is_read = true, read_at = now()
  WHERE conversation_id = _conversation_id
    AND sender_id <> auth.uid()
    AND is_read = false;
END;
$$;
