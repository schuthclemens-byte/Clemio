-- Audit-Tabelle für eingehende Apple/Google Store-Webhooks
CREATE TABLE IF NOT EXISTS public.store_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  payload jsonb,
  normalized jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_webhook_events_created
  ON public.store_webhook_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_webhook_events_provider
  ON public.store_webhook_events (provider, created_at DESC);

ALTER TABLE public.store_webhook_events ENABLE ROW LEVEL SECURITY;

-- Nur Admins dürfen lesen. Schreiben passiert ausschließlich via Service-Role
-- aus der Edge Function.
DROP POLICY IF EXISTS "Admins can view store webhook events" ON public.store_webhook_events;
CREATE POLICY "Admins can view store webhook events"
  ON public.store_webhook_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));