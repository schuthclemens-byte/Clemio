DROP TRIGGER IF EXISTS on_message_created_send_push ON public.messages;

CREATE TRIGGER on_message_created_send_push
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();