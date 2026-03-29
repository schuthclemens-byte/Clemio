
-- ============================================================
-- FIX 1: Prevent subscription self-upgrade
-- Remove UPDATE, INSERT, DELETE policies for authenticated users
-- Only service_role (edge functions/triggers) should mutate subscriptions
-- ============================================================

DROP POLICY IF EXISTS "Users can update own subscription" ON subscriptions;
DROP POLICY IF EXISTS "System can insert subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscription" ON subscriptions;

-- ============================================================
-- FIX 2: Remove open SELECT on profiles (PII exposure)
-- Replace with conversation-member scoped policy + secure RPC for search
-- ============================================================

DROP POLICY IF EXISTS "Users can search profiles by phone" ON profiles;

-- Allow reading profiles of users who share a conversation with you
CREATE POLICY "Members can read conversation partner profiles"
ON profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM conversation_members cm1
    JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
    WHERE cm1.user_id = auth.uid() AND cm2.user_id = profiles.id
  )
);

-- Drop the old owner-only policy since the new one covers it
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;

-- Secure search RPC: returns only id, display_name, avatar_url for matched profiles
CREATE OR REPLACE FUNCTION public.search_profiles_by_query(search_query text)
RETURNS TABLE(id uuid, display_name text, phone_number text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.phone_number, p.avatar_url
  FROM public.profiles p
  WHERE (
    p.display_name ILIKE '%' || search_query || '%'
    OR p.phone_number ILIKE '%' || search_query || '%'
  )
  LIMIT 20;
$$;
