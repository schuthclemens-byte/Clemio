
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  member RECORD;
  push_body JSONB;
  supabase_url TEXT := 'https://abosqgstsdahrlnvjwzc.supabase.co';
BEGIN
  FOR member IN
    SELECT cm.user_id
    FROM public.conversation_members cm
    WHERE cm.conversation_id = NEW.conversation_id
      AND cm.user_id != NEW.sender_id
  LOOP
    push_body := jsonb_build_object(
      'user_id', member.user_id,
      'title', 'Neue Nachricht',
      'body', 'Du hast eine neue Nachricht',
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
