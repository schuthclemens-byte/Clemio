
-- Add soft-delete column to conversations
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_deleted_at
ON public.conversations (deleted_at)
WHERE deleted_at IS NOT NULL;

-- Enable pg_cron for scheduled purge
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily purge of trashed chats older than 30 days
SELECT cron.schedule(
  'purge-trashed-chats',
  '0 3 * * *',
  $$ DELETE FROM public.conversations WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days'; $$
);
