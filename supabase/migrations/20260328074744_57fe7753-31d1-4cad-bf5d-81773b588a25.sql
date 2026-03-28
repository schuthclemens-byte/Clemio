CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  member RECORD;
  sender_name TEXT;
  msg_preview TEXT;
  push_body JSONB;
  supabase_url TEXT := 'https://abosqgstsdahrlnvjwzc.supabase.co';
  service_key TEXT;
  profile_rec RECORD;
BEGIN
  service_key := current_setting('supabase.service_role_key', true);
  IF service_key IS NULL OR service_key = '' THEN
    service_key := current_setting('app.settings.service_role_key', true);
  END IF;

  SELECT COALESCE(display_name, first_name, phone_number, 'Jemand')
  INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  IF NEW.message_type IN ('audio', 'voice') THEN
    msg_preview := '🎤 Sprachnachricht';
  ELSIF NEW.message_type = 'image' THEN
    msg_preview := '📷 Bild';
  ELSE
    msg_preview := LEFT(NEW.content, 30);
    IF LENGTH(NEW.content) > 30 THEN
      msg_preview := msg_preview || '…';
    END IF;
  END IF;

  FOR member IN
    SELECT cm.user_id
    FROM public.conversation_members cm
    WHERE cm.conversation_id = NEW.conversation_id
      AND cm.user_id != NEW.sender_id
  LOOP
    SELECT push_preview_enabled INTO profile_rec
    FROM public.profiles
    WHERE id = member.user_id;

    IF profile_rec.push_preview_enabled = false THEN
      push_body := jsonb_build_object(
        'user_id', member.user_id,
        'title', '',
        'body', 'Neue Nachricht',
        'data', jsonb_build_object(
          'conversation_id', NEW.conversation_id,
          'source', 'db-trigger'
        )
      );
    ELSE
      push_body := jsonb_build_object(
        'user_id', member.user_id,
        'title', sender_name,
        'body', msg_preview,
        'data', jsonb_build_object(
          'conversation_id', NEW.conversation_id,
          'source', 'db-trigger'
        )
      );
    END IF;

    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-push',
      body := push_body::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      )
    );
  END LOOP;

  RETURN NEW;
END;
$function$;