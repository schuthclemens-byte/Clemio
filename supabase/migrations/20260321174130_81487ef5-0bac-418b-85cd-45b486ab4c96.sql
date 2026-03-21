
-- Allow service role to manage whitelist, no public access needed
CREATE POLICY "Service role only" ON public.premium_whitelist
  FOR ALL TO service_role USING (true) WITH CHECK (true);
