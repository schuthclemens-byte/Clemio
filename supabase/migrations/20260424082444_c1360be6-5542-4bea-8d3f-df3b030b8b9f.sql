
-- 1. Create dedicated table for voice secrets
CREATE TABLE IF NOT EXISTS public.voice_secrets (
  user_id uuid PRIMARY KEY,
  voice_path text,
  voice_encryption_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_secrets ENABLE ROW LEVEL SECURITY;

-- Strict owner-only policies
CREATE POLICY "Owner can read own voice secrets"
  ON public.voice_secrets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert own voice secrets"
  ON public.voice_secrets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own voice secrets"
  ON public.voice_secrets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can delete own voice secrets"
  ON public.voice_secrets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Updated-at trigger
CREATE TRIGGER trg_voice_secrets_updated_at
  BEFORE UPDATE ON public.voice_secrets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_app_settings_timestamp();

-- 2. Migrate existing data from profiles
INSERT INTO public.voice_secrets (user_id, voice_path, voice_encryption_key)
SELECT id, voice_path, voice_encryption_key
FROM public.profiles
WHERE voice_path IS NOT NULL OR voice_encryption_key IS NOT NULL
ON CONFLICT (user_id) DO UPDATE
  SET voice_path = EXCLUDED.voice_path,
      voice_encryption_key = EXCLUDED.voice_encryption_key,
      updated_at = now();

-- 3. Drop the sensitive columns from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS voice_path;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS voice_encryption_key;
