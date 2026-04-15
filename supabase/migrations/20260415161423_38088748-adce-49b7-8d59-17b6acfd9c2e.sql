
-- Add voice_path column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS voice_path text;

-- Create private storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('stimmen', 'stimmen', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for stimmen bucket
CREATE POLICY "Users can upload own voice"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'stimmen' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read own voice"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'stimmen' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own voice"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'stimmen' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own voice"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'stimmen' AND auth.uid()::text = (storage.foldername(name))[1]);
