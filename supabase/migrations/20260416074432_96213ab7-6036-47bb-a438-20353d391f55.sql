
-- Add encryption key column to profiles
ALTER TABLE public.profiles ADD COLUMN voice_encryption_key text;

-- Drop existing storage policies for stimmen bucket and recreate for root-level access
DROP POLICY IF EXISTS "Users can upload own voice samples" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own voice samples" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own voice samples" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own voice samples" ON storage.objects;

-- New policies using filename prefix instead of folder
CREATE POLICY "Users can upload own stimmen"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'stimmen'
  AND (storage.filename(name) = (auth.uid()::text || '.enc') OR (storage.foldername(name))[1] = auth.uid()::text)
);

CREATE POLICY "Users can read own stimmen"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'stimmen'
  AND (storage.filename(name) = (auth.uid()::text || '.enc') OR (storage.foldername(name))[1] = auth.uid()::text)
);

CREATE POLICY "Users can update own stimmen"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'stimmen'
  AND (storage.filename(name) = (auth.uid()::text || '.enc') OR (storage.foldername(name))[1] = auth.uid()::text)
);

CREATE POLICY "Users can delete own stimmen"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'stimmen'
  AND (storage.filename(name) = (auth.uid()::text || '.enc') OR (storage.foldername(name))[1] = auth.uid()::text)
);
