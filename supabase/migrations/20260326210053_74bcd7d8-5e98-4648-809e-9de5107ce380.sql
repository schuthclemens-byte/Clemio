ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_preview_enabled boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  member RECORD;
  payload TEXT;
  sender_name TEXT;
  preview_enabled BOOLEAN;
  msg_preview TEXT;
BEGIN
  SELECT COALESCE(display_name, phone_number, 'Jemand')
  INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

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

    IF preview_enabled AND NEW.message_type = 'text' THEN
      msg_preview := LEFT(NEW.content, 30);
      IF LENGTH(NEW.content) > 30 THEN
        msg_preview := msg_preview || '…';
      END IF;
    ELSIF NEW.message_type = 'audio' THEN
      msg_preview := '🎤 Sprachnachricht';
    ELSIF NEW.message_type = 'image' THEN
      msg_preview := '📷 Bild';
    ELSE
      msg_preview := 'Du hast eine neue Nachricht';
    END IF;

    payload := json_build_object(
      'user_id', member.user_id,
      'title', sender_name,
      'body', msg_preview,
      'data', json_build_object('conversation_id', NEW.conversation_id)
    )::text;

    BEGIN
      PERFORM net.http_post(
        url := 'https://abosqgstsdahrlnvjwzc.supabase.co/functions/v1/send-push',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFib3NxZ3N0c2RhaHJsbnZqd3pjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMzQzMDEsImV4cCI6MjA4OTYxMDMwMX0.2Or2ZGw0e0hqZS3CL_45V1yV3kU7zDe49e1FjG02WHU'
        ),
        body := payload::jsonb
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Push notification failed for user %: %', member.user_id, SQLERRM;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_message_push ON public.messages;
CREATE TRIGGER on_new_message_push
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();