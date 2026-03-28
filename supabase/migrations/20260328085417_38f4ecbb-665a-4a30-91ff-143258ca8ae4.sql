
CREATE OR REPLACE TRIGGER on_new_message_notify
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();
