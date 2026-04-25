DROP TRIGGER IF EXISTS trg_notify_admin_on_report ON public.reports;

CREATE TRIGGER trg_notify_admin_on_report
AFTER INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_on_report();