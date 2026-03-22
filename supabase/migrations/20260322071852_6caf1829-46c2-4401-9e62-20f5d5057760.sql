
-- Table for storing voice clones of contacts (uploaded by the user, not the contact themselves)
CREATE TABLE public.contact_voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  contact_user_id UUID NOT NULL,
  elevenlabs_voice_id TEXT NOT NULL,
  voice_name TEXT,
  sample_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, contact_user_id)
);

ALTER TABLE public.contact_voice_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own contact voices"
  ON public.contact_voice_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contact voices"
  ON public.contact_voice_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contact voices"
  ON public.contact_voice_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contact voices"
  ON public.contact_voice_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
