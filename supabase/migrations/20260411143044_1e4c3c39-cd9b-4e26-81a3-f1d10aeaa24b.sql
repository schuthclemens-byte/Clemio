-- Create a SECURITY DEFINER function for atomic direct chat creation
-- This bypasses the RLS recursion issue where conversation_members INSERT
-- policy needs to read conversations, which needs to read conversation_members
CREATE OR REPLACE FUNCTION public.create_direct_chat(_target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _current_user_id uuid := auth.uid();
  _existing_conv_id uuid;
  _new_conv_id uuid;
BEGIN
  -- Block if not authenticated
  IF _current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Block self-chat
  IF _current_user_id = _target_user_id THEN
    RAISE EXCEPTION 'Cannot create a chat with yourself';
  END IF;

  -- Check for existing 1:1 conversation
  SELECT c.id INTO _existing_conv_id
  FROM conversations c
  WHERE c.is_group = false
    AND EXISTS (
      SELECT 1 FROM conversation_members cm1
      WHERE cm1.conversation_id = c.id AND cm1.user_id = _current_user_id
    )
    AND EXISTS (
      SELECT 1 FROM conversation_members cm2
      WHERE cm2.conversation_id = c.id AND cm2.user_id = _target_user_id
    )
  LIMIT 1;

  IF _existing_conv_id IS NOT NULL THEN
    RETURN _existing_conv_id;
  END IF;

  -- Create new conversation
  _new_conv_id := gen_random_uuid();

  INSERT INTO conversations (id, created_by, is_group, name)
  VALUES (_new_conv_id, _current_user_id, false, NULL);

  -- Add creator as member
  INSERT INTO conversation_members (conversation_id, user_id)
  VALUES (_new_conv_id, _current_user_id);

  -- Create accepted invitation for RLS consistency
  INSERT INTO chat_invitations (conversation_id, invited_by, invited_user_id, status)
  VALUES (_new_conv_id, _current_user_id, _target_user_id, 'accepted');

  -- Add target as member
  INSERT INTO conversation_members (conversation_id, user_id)
  VALUES (_new_conv_id, _target_user_id);

  RETURN _new_conv_id;
END;
$$;

-- Clean up orphaned conversations (0 members) from previous failed attempts
DELETE FROM conversations
WHERE id IN (
  SELECT c.id FROM conversations c
  LEFT JOIN conversation_members cm ON cm.conversation_id = c.id
  WHERE cm.id IS NULL
);