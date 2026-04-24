-- Remove duplicate / overlapping policies on the 'stimmen' bucket and keep
-- a single, unambiguous folder-based policy per operation.

DROP POLICY IF EXISTS "Users can read own stimmen" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own stimmen" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own stimmen" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own stimmen" ON storage.objects;

DROP POLICY IF EXISTS "Users can read own voice" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own voice" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own voice" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own voice" ON storage.objects;

-- Single canonical folder-based policies for the 'stimmen' bucket.
CREATE POLICY "Owners can read own stimmen"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'stimmen'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owners can upload own stimmen"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'stimmen'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owners can update own stimmen"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'stimmen'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'stimmen'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owners can delete own stimmen"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'stimmen'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
