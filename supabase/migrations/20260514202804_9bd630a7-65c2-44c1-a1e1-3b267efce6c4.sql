-- Make deny-by-default explicit on internal_secrets so the linter
-- no longer reports "RLS Enabled No Policy". Service role still
-- bypasses RLS; authenticated/anon are explicitly denied.
CREATE POLICY "Deny all access to internal_secrets"
ON public.internal_secrets
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);