-- Remove overly permissive chat-media read policy
DROP POLICY IF EXISTS "Authenticated users can read chat media" ON storage.objects;

-- Create new restrictive policy that only allows access via signed URLs
-- No direct SELECT policy - access is mediated through the edge function

-- Keep the existing INSERT policy that ensures users can only upload to their own folder
-- Files are stored as {user_id}/{filename}

-- Keep existing DELETE policy for users deleting their own files