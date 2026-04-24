-- 1) Update create_direct_chat to use pending status when no prior relationship exists.
CREATE OR REPLACE FUNCTION public.create_direct_chat(_target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _current_user_id uuid := auth.uid();
  _existing_conv_id uuid;
  _new_conv_id uuid;
  _has_relationship boolean := false;
  _pending_count_hour int;
  _pending_count_day int;
  _initial_status text;
BEGIN
  IF _current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _current_user_id = _target_user_id THEN
    RAISE EXCEPTION 'Cannot create a chat with yourself';
  END IF;

  -- Block if either party blocked the other
  IF EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocked_by = _target_user_id AND user_id = _current_user_id)
       OR (blocked_by = _current_user_id AND user_id = _target_user_id)
  ) THEN
    RAISE EXCEPTION 'request_not_allowed' USING ERRCODE = 'P0001';
  END IF;

  -- Check for existing 1:1 conversation between the two
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

  -- Existing pending invitation? Reuse the conversation
  SELECT ci.conversation_id INTO _existing_conv_id
  FROM chat_invitations ci
  JOIN conversations c ON c.id = ci.conversation_id
  WHERE c.is_group = false
    AND ci.invited_by = _current_user_id
    AND ci.invited_user_id = _target_user_id
    AND ci.status = 'pending'
  LIMIT 1;

  IF _existing_conv_id IS NOT NULL THEN
    RETURN _existing_conv_id;
  END IF;

  -- Determine if a prior relationship exists (gemeinsame Gruppe oder Voice-Consent)
  SELECT EXISTS (
    SELECT 1
    FROM conversation_members cm1
    JOIN conversation_members cm2
      ON cm1.conversation_id = cm2.conversation_id
    JOIN conversations c ON c.id = cm1.conversation_id
    WHERE cm1.user_id = _current_user_id
      AND cm2.user_id = _target_user_id
      AND c.is_group = true
  ) OR EXISTS (
    SELECT 1 FROM voice_consents vc
    WHERE vc.status IN ('pending', 'granted')
      AND (
        (vc.voice_owner_id = _current_user_id AND vc.granted_to_user_id = _target_user_id)
        OR (vc.voice_owner_id = _target_user_id AND vc.granted_to_user_id = _current_user_id)
      )
  ) INTO _has_relationship;

  -- Spam-Schutz nur wenn neue Anfrage
  IF NOT _has_relationship THEN
    SELECT count(*) INTO _pending_count_hour
    FROM chat_invitations ci
    WHERE ci.invited_by = _current_user_id
      AND ci.status = 'pending'
      AND ci.created_at > now() - interval '1 hour';

    IF _pending_count_hour >= 5 THEN
      RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
    END IF;

    SELECT count(*) INTO _pending_count_day
    FROM chat_invitations ci
    WHERE ci.invited_by = _current_user_id
      AND ci.created_at > now() - interval '24 hours'
      AND ci.status IN ('pending', 'declined');

    IF _pending_count_day >= 20 THEN
      RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  _initial_status := CASE WHEN _has_relationship THEN 'accepted' ELSE 'pending' END;

  -- Create new conversation
  _new_conv_id := gen_random_uuid();

  INSERT INTO conversations (id, created_by, is_group, name)
  VALUES (_new_conv_id, _current_user_id, false, NULL);

  -- Add creator as member
  INSERT INTO conversation_members (conversation_id, user_id)
  VALUES (_new_conv_id, _current_user_id);

  -- Create invitation (pending if Fremder, accepted if vorhandene Beziehung)
  INSERT INTO chat_invitations (conversation_id, invited_by, invited_user_id, status)
  VALUES (_new_conv_id, _current_user_id, _target_user_id, _initial_status);

  -- Add target as member only if accepted
  IF _initial_status = 'accepted' THEN
    INSERT INTO conversation_members (conversation_id, user_id)
    VALUES (_new_conv_id, _target_user_id);
  END IF;

  RETURN _new_conv_id;
END;
$function$;

-- 2) Preview RPC: return first message + sender display info for a pending invitation
CREATE OR REPLACE FUNCTION public.get_message_request_preview(_invitation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _me uuid := auth.uid();
  _inv record;
  _msg record;
  _sender record;
BEGIN
  IF _me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _inv
  FROM chat_invitations
  WHERE id = _invitation_id
    AND invited_user_id = _me
    AND status = 'pending';

  IF _inv IS NULL THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001';
  END IF;

  SELECT id, content, message_type, created_at, sender_id
    INTO _msg
  FROM messages
  WHERE conversation_id = _inv.conversation_id
  ORDER BY created_at ASC
  LIMIT 1;

  SELECT id, display_name, first_name, avatar_url
    INTO _sender
  FROM profiles
  WHERE id = _inv.invited_by;

  RETURN jsonb_build_object(
    'invitation_id', _inv.id,
    'conversation_id', _inv.conversation_id,
    'sender', jsonb_build_object(
      'id', _sender.id,
      'display_name', COALESCE(_sender.display_name, _sender.first_name, 'Nutzer'),
      'avatar_url', _sender.avatar_url
    ),
    'first_message', CASE
      WHEN _msg.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'content', LEFT(COALESCE(_msg.content, ''), 280),
        'message_type', _msg.message_type,
        'created_at', _msg.created_at
      )
    END,
    'created_at', _inv.created_at
  );
END;
$function$;

-- 3) Accept invitation (atomic, replaces inline logic)
CREATE OR REPLACE FUNCTION public.accept_message_request(_invitation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _me uuid := auth.uid();
  _inv record;
BEGIN
  IF _me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _inv
  FROM chat_invitations
  WHERE id = _invitation_id
    AND invited_user_id = _me
    AND status = 'pending';

  IF _inv IS NULL THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001';
  END IF;

  UPDATE chat_invitations SET status = 'accepted', updated_at = now()
  WHERE id = _inv.id;

  INSERT INTO conversation_members (conversation_id, user_id)
  VALUES (_inv.conversation_id, _me)
  ON CONFLICT DO NOTHING;

  RETURN _inv.conversation_id;
END;
$function$;

-- 4) Decline invitation
CREATE OR REPLACE FUNCTION public.decline_message_request(_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _me uuid := auth.uid();
  _inv record;
BEGIN
  IF _me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _inv
  FROM chat_invitations
  WHERE id = _invitation_id
    AND invited_user_id = _me
    AND status = 'pending';

  IF _inv IS NULL THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001';
  END IF;

  UPDATE chat_invitations SET status = 'declined', updated_at = now()
  WHERE id = _inv.id;
END;
$function$;

-- 5) Block sender via invitation: declines + blocks + removes invitation row
CREATE OR REPLACE FUNCTION public.block_message_request(_invitation_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _me uuid := auth.uid();
  _inv record;
BEGIN
  IF _me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _inv
  FROM chat_invitations
  WHERE id = _invitation_id
    AND invited_user_id = _me
    AND status = 'pending';

  IF _inv IS NULL THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001';
  END IF;

  -- Mark declined
  UPDATE chat_invitations SET status = 'declined', updated_at = now()
  WHERE id = _inv.id;

  -- Block sender (idempotent)
  INSERT INTO blocked_users (blocked_by, user_id, reason)
  VALUES (_me, _inv.invited_by, COALESCE(_reason, 'message_request'))
  ON CONFLICT DO NOTHING;
END;
$function$;