ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS iap_provider text,
  ADD COLUMN IF NOT EXISTS iap_original_transaction_id text,
  ADD COLUMN IF NOT EXISTS iap_product_id text,
  ADD COLUMN IF NOT EXISTS iap_revenuecat_app_user_id text,
  ADD COLUMN IF NOT EXISTS iap_environment text,
  ADD COLUMN IF NOT EXISTS iap_last_event_at timestamptz,
  ADD COLUMN IF NOT EXISTS iap_will_renew boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_iap_original_transaction_id_uidx
  ON public.subscriptions (iap_original_transaction_id)
  WHERE iap_original_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS subscriptions_iap_revenuecat_app_user_id_idx
  ON public.subscriptions (iap_revenuecat_app_user_id)
  WHERE iap_revenuecat_app_user_id IS NOT NULL;