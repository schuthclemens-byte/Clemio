-- Tighten RLS on public.voice_consents.
--
-- Mapping for this codebase:
--   voice_owner_id      = the user who *grants* consent (own voice)
--   granted_to_user_id  = the user who *receives* consent
--
-- Goals:
--   * INSERT only when auth.uid() = voice_owner_id (no consents on behalf
--     of others; cross-user requests must go through the rate-limited
--     SECURITY DEFINER RPC public.request_voice_consent)
--   * SELECT visible to both involved parties
--   * UPDATE / DELETE only by the voice owner

-- 1. INSERT — replace any previous insert policy with a strict owner-only rule
DROP POLICY IF EXISTS "Voice owner can create consent" ON public.voice_consents;
DROP POLICY IF EXISTS "Users can insert consents" ON public.voice_consents;

CREATE POLICY "Voice owner can create consent"
ON public.voice_consents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = voice_owner_id);

-- 2. SELECT — keep visibility for both parties, but recreate explicitly
DROP POLICY IF EXISTS "Voice owner can read consents" ON public.voice_consents;

CREATE POLICY "Participants can read consents"
ON public.voice_consents
FOR SELECT
TO authenticated
USING (
  auth.uid() = voice_owner_id
  OR auth.uid() = granted_to_user_id
);

-- 3. UPDATE — only the voice owner
DROP POLICY IF EXISTS "Voice owner can update consent" ON public.voice_consents;

CREATE POLICY "Voice owner can update consent"
ON public.voice_consents
FOR UPDATE
TO authenticated
USING (auth.uid() = voice_owner_id)
WITH CHECK (auth.uid() = voice_owner_id);

-- 4. DELETE — only the voice owner (previously also allowed the recipient)
DROP POLICY IF EXISTS "Users can delete own consents" ON public.voice_consents;

CREATE POLICY "Voice owner can delete consent"
ON public.voice_consents
FOR DELETE
TO authenticated
USING (auth.uid() = voice_owner_id);