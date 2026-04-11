
-- Add whitelist entries
INSERT INTO public.premium_whitelist (phone_number) VALUES ('+491797876617'), ('49123456789')
ON CONFLICT DO NOTHING;

-- Create subscriptions for all users who don't have one
INSERT INTO public.subscriptions (user_id, plan, is_founding_user, trial_start, premium_until)
SELECT p.id, 
  CASE WHEN EXISTS (
    SELECT 1 FROM premium_whitelist pw 
    WHERE regexp_replace(regexp_replace(regexp_replace(pw.phone_number, '^\+49', '0'), '^0049', '0'), '[^0-9]', '', 'g') 
        = regexp_replace(regexp_replace(regexp_replace(p.phone_number, '^\+49', '0'), '^0049', '0'), '[^0-9]', '', 'g')
  ) THEN 'founding' ELSE 'trial' END,
  true,
  now(),
  CASE WHEN EXISTS (
    SELECT 1 FROM premium_whitelist pw 
    WHERE regexp_replace(regexp_replace(regexp_replace(pw.phone_number, '^\+49', '0'), '^0049', '0'), '[^0-9]', '', 'g') 
        = regexp_replace(regexp_replace(regexp_replace(p.phone_number, '^\+49', '0'), '^0049', '0'), '[^0-9]', '', 'g')
  ) THEN '2099-12-31'::timestamptz ELSE now() + interval '7 days' END
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = p.id);
