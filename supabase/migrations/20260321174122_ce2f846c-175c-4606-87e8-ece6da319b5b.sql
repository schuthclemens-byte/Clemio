
-- Whitelist table for permanent free premium users
CREATE TABLE public.premium_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now()
);

-- No RLS needed, only used by trigger (SECURITY DEFINER)
ALTER TABLE public.premium_whitelist ENABLE ROW LEVEL SECURITY;

-- Replace the subscription trigger to check whitelist
CREATE OR REPLACE FUNCTION public.handle_new_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_count int;
  is_founding boolean := false;
  is_whitelisted boolean := false;
  trial_days int := 7;
  premium_end timestamp with time zone;
  user_phone text;
BEGIN
  -- Get user's phone number from profile or metadata
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone_number', NEW.email);
  
  -- Check whitelist (normalize: try with +49, 0049, etc.)
  SELECT EXISTS (
    SELECT 1 FROM public.premium_whitelist
    WHERE phone_number = user_phone
       OR phone_number = replace(user_phone, '+', '00')
       OR replace(phone_number, '00', '+') = user_phone
  ) INTO is_whitelisted;

  IF is_whitelisted THEN
    INSERT INTO public.subscriptions (user_id, plan, is_founding_user, trial_start, trial_end, premium_until)
    VALUES (NEW.id, 'founding', true, now(), NULL, '2099-12-31'::timestamp with time zone);
    RETURN NEW;
  END IF;

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
$$;
