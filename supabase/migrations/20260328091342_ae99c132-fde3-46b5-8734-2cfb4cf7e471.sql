
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
  msg_body TEXT;
  push_body JSONB;
  supabase_url TEXT := 'https://abosqgstsdahrlnvjwzc.supabase.co';
BEGIN
  SELECT COALESCE(display_name, first_name, phone_number, 'Jemand')
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
    push_body := jsonb_build_object(
      'user_id', member.user_id,
      'title', 'Neue Nachricht',
      'body', msg_body,
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
