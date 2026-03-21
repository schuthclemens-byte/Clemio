-- Add reply_to column for reply feature
ALTER TABLE public.messages ADD COLUMN reply_to uuid REFERENCES public.messages(id) ON DELETE SET NULL;

-- Add archived flag for conversations
ALTER TABLE public.conversations ADD COLUMN is_archived boolean NOT NULL DEFAULT false;