-- Backfill missing subscriptions for existing users
INSERT INTO public.subscriptions (user_id, plan, is_founding_user, trial_start, premium_until)
SELECT u.id, 'founding', true, now(), '2099-12-31'::timestamp with time zone
FROM auth.users u
LEFT JOIN public.subscriptions s ON s.user_id = u.id
WHERE s.id IS NULL;