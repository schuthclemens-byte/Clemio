
-- Subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'free',
  is_founding_user boolean NOT NULL DEFAULT false,
  trial_start timestamp with time zone DEFAULT now(),
  trial_end timestamp with time zone,
  premium_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscription"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert subscription"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to auto-create subscription on new user
CREATE OR REPLACE FUNCTION public.handle_new_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_count int;
  is_founding boolean := false;
  trial_days int := 7;
  premium_end timestamp with time zone;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.subscriptions;
  
  IF user_count < 50 THEN
    is_founding := true;
    premium_end := now() + interval '6 months';
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

-- Trigger: create subscription when profile is created
CREATE TRIGGER on_profile_created_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_subscription();
