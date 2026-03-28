DROP TRIGGER IF EXISTS on_new_message_push ON public.messages;
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  member RECORD;
  sender_name TEXT;
  msg_preview TEXT;
  push_body JSONB;
  supabase_url TEXT := 'https://abosqgstsdahrlnvjwzc.supabase.co';
  service_key TEXT;
  push_preview_enabled_value BOOLEAN;
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
    SELECT p.push_preview_enabled
    INTO push_preview_enabled_value
    FROM public.profiles p
    WHERE p.id = member.user_id;

    push_body := jsonb_build_object(
      'user_id', member.user_id,
      'title', sender_name,
      'body', CASE WHEN push_preview_enabled_value = false THEN 'Neue Nachricht' ELSE msg_preview END,
      'data', jsonb_build_object(
        'conversation_id', NEW.conversation_id,
        'source', 'db-trigger'
      )
    );

    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-push',
      body := push_body,
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_message_notify
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();