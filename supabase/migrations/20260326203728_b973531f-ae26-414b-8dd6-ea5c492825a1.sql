
-- Allow users to update their own push subscriptions (needed for upsert)
CREATE POLICY "Users can update own subscriptions"
ON public.push_subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create the trigger function that calls send-push edge function
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
  supabase_url TEXT;
  service_key TEXT;
BEGIN
  -- Get sender display name
  SELECT COALESCE(display_name, phone_number, 'Jemand')
  INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  -- Get Supabase URL and service role key from config
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.service_role_key', true);

  -- For each conversation member (except sender), call send-push
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
        url := supabase_url || '/functions/v1/send-push',
        headers := json_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
        )::jsonb,
        body := payload::jsonb
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log but don't block message insert
      RAISE WARNING 'Push notification failed for user %: %', member.user_id, SQLERRM;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Attach trigger to messages table
CREATE TRIGGER on_new_message_push
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();
