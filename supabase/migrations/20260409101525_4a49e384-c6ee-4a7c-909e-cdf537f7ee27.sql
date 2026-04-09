CREATE OR REPLACE FUNCTION public.notify_chat_invitation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inviter_name TEXT;
  conv_name TEXT;
  push_payload JSONB;
  supabase_url TEXT := 'https://abosqgstsdahrlnvjwzc.supabase.co';
BEGIN
  -- Get inviter display name
  SELECT COALESCE(display_name, first_name, 'Jemand')
  INTO inviter_name
  FROM public.profiles
  WHERE id = NEW.invited_by;

  -- Get conversation name
  SELECT COALESCE(name, 'Gruppe')
  INTO conv_name
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  push_payload := jsonb_build_object(
    'user_id', NEW.invited_user_id,
    'title', inviter_name,
    'body', 'Einladung zur Gruppe "' || conv_name || '"',
    'data', jsonb_build_object(
      'type', 'group_invitation',
      'conversation_id', NEW.conversation_id,
      'invitation_id', NEW.id
    )
  );

  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-push',
    body := push_payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_chat_invitation_notify
AFTER INSERT ON public.chat_invitations
FOR EACH ROW
EXECUTE FUNCTION public.notify_chat_invitation();