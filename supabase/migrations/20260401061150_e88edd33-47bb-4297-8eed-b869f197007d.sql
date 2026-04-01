
-- Clean up duplicate push_subscriptions: keep only the latest per user_id
DELETE FROM public.push_subscriptions
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.push_subscriptions
  ORDER BY user_id, created_at DESC NULLS LAST
);

-- Clean up duplicate endpoints (different users somehow got same endpoint)
DELETE FROM public.push_subscriptions
WHERE id NOT IN (
  SELECT DISTINCT ON (endpoint) id
  FROM public.push_subscriptions
  ORDER BY endpoint, created_at DESC NULLS LAST
);

-- Add unique constraint: one subscription per user
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_user_id_unique ON public.push_subscriptions (user_id);

-- Add unique constraint: one user per endpoint
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_unique ON public.push_subscriptions (endpoint);
