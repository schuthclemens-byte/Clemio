
-- Add audio_url column to messages for permanent TTS audio references
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS audio_url text;

-- Allow authenticated users to download from tts-cache bucket
-- File names are SHA256 hashes - only accessible if you know the exact filename (via message.audio_url)
CREATE POLICY "Authenticated users can download cached TTS audio"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'tts-cache');
