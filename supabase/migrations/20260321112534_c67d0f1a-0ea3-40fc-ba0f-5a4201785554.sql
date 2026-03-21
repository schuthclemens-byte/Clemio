CREATE OR REPLACE FUNCTION public.handle_new_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_count int;
  is_founding boolean := false;
  trial_days int := 7;
  premium_end timestamp with time zone;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.subscriptions;
  
  IF user_count < 50 THEN
    is_founding := true;
    premium_end := now() + interval '60 days';
    trial_days := 0;
  ELSE
    premium_end := now() + interval '7 days';
  END IF;

  INSERT INTO public.subscriptions (user_id, plan, is_founding_user, trial_start, trial_end, premium_until)
  VALUES (
    NEW.id,
    CASE WHEN is_founding THEN 'founding' ELSE 'trial' END,
    is_founding,
    now(),
    CASE WHEN is_founding THEN NULL ELSE now() + interval '7 days' END,
    premium_end
  );
  
  RETURN NEW;
END;
$function$