-- Allow users to insert their own blocks
CREATE POLICY "Users can block others"
ON public.blocked_users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = blocked_by);

-- Allow users to see who they blocked
CREATE POLICY "Users can read own blocks"
ON public.blocked_users
FOR SELECT
TO authenticated
USING (auth.uid() = blocked_by);

-- Allow users to unblock
CREATE POLICY "Users can unblock"
ON public.blocked_users
FOR DELETE
TO authenticated
USING (auth.uid() = blocked_by);