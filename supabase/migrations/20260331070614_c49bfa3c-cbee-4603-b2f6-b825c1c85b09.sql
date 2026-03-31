
-- Make chat-media bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-media';

-- Drop the old unrestricted upload policy
DROP POLICY IF EXISTS "Authenticated users can upload chat media" ON storage.objects;

-- Create scoped upload policy (user can only upload to their own folder)
CREATE POLICY "Users can upload own chat media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Drop the old "anyone can read" policy
DROP POLICY IF EXISTS "Anyone can read chat media" ON storage.objects;

-- Create scoped read policy (authenticated users can read chat-media)
CREATE POLICY "Authenticated users can read chat media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-media');
