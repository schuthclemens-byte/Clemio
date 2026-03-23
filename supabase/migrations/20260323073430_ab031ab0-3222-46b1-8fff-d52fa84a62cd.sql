CREATE OR REPLACE FUNCTION public.handle_new_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_count int;
  is_founding boolean := false;
  is_whitelisted boolean := false;
  premium_end timestamp with time zone;
  user_phone text;
  normalized_phone text;
BEGIN
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.email);
  
  normalized_phone := user_phone;
  normalized_phone := regexp_replace(normalized_phone, '^\+49', '0');
  normalized_phone := regexp_replace(normalized_phone, '^0049', '0');
  normalized_phone := regexp_replace(normalized_phone, '[^0-9]', '', 'g');
  
  SELECT EXISTS (
    SELECT 1 FROM public.premium_whitelist
    WHERE regexp_replace(regexp_replace(regexp_replace(phone_number, '^\+49', '0'), '^0049', '0'), '[^0-9]', '', 'g') = normalized_phone
  ) INTO is_whitelisted;

  IF is_whitelisted THEN
    INSERT INTO public.subscriptions (user_id, plan, is_founding_user, trial_start, trial_end, premium_until)
    VALUES (NEW.id, 'founding', true, now(), NULL, '2099-12-31'::timestamp with time zone);
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO user_count FROM public.subscriptions
  WHERE premium_until < '2099-01-01'::timestamp with time zone;
  
  IF user_count < 50 THEN
    is_founding := true;
    premium_end := now() + interval '60 days';
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
$function$;