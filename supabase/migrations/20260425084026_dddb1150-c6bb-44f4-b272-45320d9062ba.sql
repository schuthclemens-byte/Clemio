CREATE OR REPLACE FUNCTION public.get_user_security_email(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(trim(p.security_email), '')
  FROM public.profiles p
  WHERE p.id = _user_id
    AND (auth.uid() = p.id OR public.has_role(auth.uid(), 'admin'::public.app_role))
    AND p.security_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  member RECORD;
  sender_name TEXT;
  msg_body TEXT;
  push_title TEXT;
  push_body_text TEXT;
  preview_enabled BOOLEAN;
  push_payload JSONB;
  supabase_url TEXT := 'https://zvvjgkxtgtpniashvqsl.supabase.co';
  pending_recipient RECORD;
BEGIN
  SELECT COALESCE(NULLIF(display_name, ''), NULLIF(first_name, ''), 'Jemand')
  INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  IF NEW.message_type IN ('audio', 'voice') THEN
    msg_body := sender_name || ': 🎤 Sprachnachricht';
  ELSIF NEW.message_type = 'image' THEN
    msg_body := sender_name || ': 📷 Bild';
  ELSE
    msg_body := sender_name || ': ' || LEFT(NEW.content, 50);
  END IF;

  FOR member IN
    SELECT cm.user_id
    FROM public.conversation_members cm
    WHERE cm.conversation_id = NEW.conversation_id
      AND cm.user_id != NEW.sender_id
  LOOP
    SELECT COALESCE(p.push_preview_enabled, false)
    INTO preview_enabled
    FROM public.profiles p
    WHERE p.id = member.user_id;

    IF preview_enabled THEN
      push_title := sender_name;
      push_body_text := msg_body;
    ELSE
      push_title := 'Neue Nachricht';
      push_body_text := '';
    END IF;

    push_payload := jsonb_build_object(
      'user_id', member.user_id,
      'title', push_title,
      'body', push_body_text,
      'data', jsonb_build_object(
        'conversation_id', NEW.conversation_id,
        'source', 'db-trigger'
      )
    );

    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-push',
      body := push_payload,
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      )
    );
  END LOOP;

  FOR pending_recipient IN
    SELECT ci.invited_user_id
    FROM public.chat_invitations ci
    WHERE ci.conversation_id = NEW.conversation_id
      AND ci.status = 'pending'
      AND ci.invited_user_id != NEW.sender_id
  LOOP
    push_payload := jsonb_build_object(
      'user_id', pending_recipient.invited_user_id,
      'title', 'Neue Nachrichtenanfrage',
      'body', '',
      'data', jsonb_build_object(
        'type', 'message_request',
        'source', 'db-trigger'
      )
    );

    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-push',
      body := push_payload,
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      )
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.search_profiles_by_query(search_query text)
RETURNS TABLE(id uuid, display_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id,
         COALESCE(NULLIF(p.display_name, ''), NULLIF(p.first_name, ''), 'Nutzer') AS display_name,
         p.avatar_url
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND COALESCE(search_query, '') <> ''
    AND (
      p.display_name ILIKE '%' || search_query || '%'
      OR p.first_name ILIKE '%' || search_query || '%'
      OR p.phone_normalized = public.normalize_contact_phone(search_query)
    )
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION public.match_contacts_by_phone(_phones text[])
RETURNS TABLE(user_id uuid, display_name text, avatar_url text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _normalized text[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF _phones IS NULL OR array_length(_phones, 1) IS NULL THEN
    RETURN;
  END IF;

  IF array_length(_phones, 1) > 500 THEN
    RAISE EXCEPTION 'too_many_contacts' USING ERRCODE = 'P0001';
  END IF;

  SELECT array_agg(DISTINCT normalized_phone)
  INTO _normalized
  FROM (
    SELECT public.normalize_contact_phone(phone) AS normalized_phone
    FROM unnest(_phones) AS phone
  ) values_to_match
  WHERE normalized_phone IS NOT NULL;

  IF _normalized IS NULL OR array_length(_normalized, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id AS user_id,
         COALESCE(NULLIF(p.display_name, ''), NULLIF(p.first_name, ''), 'Nutzer') AS display_name,
         p.avatar_url
  FROM public.profiles p
  WHERE p.id <> auth.uid()
    AND p.phone_normalized = ANY(_normalized)
  ORDER BY display_name
  LIMIT 100;
END;
$$;