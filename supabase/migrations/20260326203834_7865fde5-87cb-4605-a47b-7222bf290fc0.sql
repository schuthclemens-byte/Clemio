
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
    payload := json_build_object(
      'user_id', member.user_id,
      'title', sender_name,
      'body', LEFT(NEW.content, 200),
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
