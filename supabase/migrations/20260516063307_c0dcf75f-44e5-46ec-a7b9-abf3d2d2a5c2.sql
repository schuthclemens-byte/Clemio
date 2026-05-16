-- Additive columns for idempotent RevenueCat event processing
ALTER TABLE public.store_webhook_events
  ADD COLUMN IF NOT EXISTS revenuecat_event_id text,
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS environment text,
  ADD COLUMN IF NOT EXISTS app_user_id text,
  ADD COLUMN IF NOT EXISTS product_id text,
  ADD COLUMN IF NOT EXISTS entitlement_id text,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz;

-- Unique index ensures duplicate events are rejected at DB level
CREATE UNIQUE INDEX IF NOT EXISTS store_webhook_events_revenuecat_event_id_key
  ON public.store_webhook_events(revenuecat_event_id)
  WHERE revenuecat_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS store_webhook_events_app_user_id_idx
  ON public.store_webhook_events(app_user_id);