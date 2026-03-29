-- Fix search_path on enforce_message_update_scope
CREATE OR REPLACE FUNCTION public.enforce_message_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.sender_id = auth.uid() THEN
    RETURN NEW;
  END IF;

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