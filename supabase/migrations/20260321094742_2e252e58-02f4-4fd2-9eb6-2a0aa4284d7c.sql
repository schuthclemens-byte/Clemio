-- Voice profiles table for storing cloned voice references
CREATE TABLE public.voice_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  elevenlabs_voice_id text NOT NULL,
  voice_name text,
  sample_url text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own voice profile"
  ON public.voice_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own voice profile"
  ON public.voice_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice profile"
  ON public.voice_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own voice profile"
  ON public.voice_profiles FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated can check voice profiles exist"
  ON public.voice_profiles FOR SELECT TO authenticated
  USING (true);

-- Voice consent table
CREATE TABLE public.voice_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(voice_owner_id, granted_to_user_id)
);

ALTER TABLE public.voice_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voice owner can read consents"
  ON public.voice_consents FOR SELECT TO authenticated
  USING (auth.uid() = voice_owner_id OR auth.uid() = granted_to_user_id);

CREATE POLICY "Users can request consent"
  ON public.voice_consents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = granted_to_user_id);

CREATE POLICY "Voice owner can update consent"
  ON public.voice_consents FOR UPDATE TO authenticated
  USING (auth.uid() = voice_owner_id);

-- Storage bucket for voice samples
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-samples', 'voice-samples', false);

CREATE POLICY "Users can upload own voice samples"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'voice-samples' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own voice samples"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'voice-samples' AND (storage.foldername(name))[1] = auth.uid()::text);