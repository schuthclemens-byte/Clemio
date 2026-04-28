-- Tighten realtime channel authorization
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can subscribe to non-conversation channels" ON realtime.messages;
DROP POLICY IF EXISTS "Users can only subscribe to their conversation channels" ON realtime.messages;
DROP POLICY IF EXISTS "Users can subscribe to authorized app channels" ON realtime.messages;

CREATE POLICY "Users can subscribe to authorized app channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() ~ '^chat-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      public.is_conversation_member(substring(realtime.topic() from 6)::uuid, auth.uid())
    WHEN realtime.topic() ~ '^typing-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      public.is_conversation_member(substring(realtime.topic() from 8)::uuid, auth.uid())
    WHEN realtime.topic() ~ '^call-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      public.is_conversation_member(substring(realtime.topic() from 6)::uuid, auth.uid())
    WHEN realtime.topic() ~ '^global-calls-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      auth.uid() = substring(realtime.topic() from 14)::uuid
    WHEN realtime.topic() ~ '^presence-watch-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      auth.uid() = substring(realtime.topic() from 16)::uuid
      OR EXISTS (
        SELECT 1
        FROM public.conversation_members cm1
        JOIN public.conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
        WHERE cm1.user_id = auth.uid()
          AND cm2.user_id = substring(realtime.topic() from 16)::uuid
      )
    WHEN realtime.topic() ~ '^user-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[a-z0-9-]+$' THEN
      auth.uid() = substring(realtime.topic() from 6 for 36)::uuid
    WHEN realtime.topic() = 'admin-reports-errors-realtime' THEN
      public.has_role(auth.uid(), 'admin'::public.app_role)
    ELSE
      false
  END
);

-- Remove sensitive/admin-oriented tables from Realtime publication if present.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'app_error_reports') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.app_error_reports;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'app_settings') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.app_settings;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reports') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.reports;
  END IF;
END $$;

-- Restrict profile search to exact phone discovery or already-related contacts by name.
CREATE OR REPLACE FUNCTION public.search_profiles_by_query(search_query text)
RETURNS TABLE(id uuid, display_name text, avatar_url text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _query text := trim(COALESCE(search_query, ''));
  _normalized text := public.normalize_contact_phone(search_query);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF _query = '' OR char_length(_query) > 80 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id,
         COALESCE(NULLIF(p.display_name, ''), NULLIF(p.first_name, ''), 'Nutzer') AS display_name,
         p.avatar_url
  FROM public.profiles p
  WHERE p.id <> auth.uid()
    AND (
      (_normalized IS NOT NULL AND p.phone_normalized = _normalized)
      OR (
        char_length(_query) >= 3
        AND (
          p.display_name ILIKE '%' || _query || '%'
          OR p.first_name ILIKE '%' || _query || '%'
        )
        AND (
          EXISTS (
            SELECT 1
            FROM public.conversation_members cm1
            JOIN public.conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
            WHERE cm1.user_id = auth.uid()
              AND cm2.user_id = p.id
          )
          OR EXISTS (
            SELECT 1
            FROM public.voice_consents vc
            WHERE vc.status IN ('pending', 'granted')
              AND (
                (vc.voice_owner_id = auth.uid() AND vc.granted_to_user_id = p.id)
                OR (vc.voice_owner_id = p.id AND vc.granted_to_user_id = auth.uid())
              )
          )
        )
      )
    )
  ORDER BY display_name
  LIMIT 20;
END;
$function$;

REVOKE ALL ON FUNCTION public.search_profiles_by_query(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_profiles_by_query(text) TO authenticated;

-- Remove unnecessary public execution of SECURITY DEFINER helpers/triggers.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_conversation_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_app_settings_timestamp() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_app_error_reports_timestamp() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_subscription() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_call_identity_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_message_update_scope() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_profile_phone_normalized() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_chat_invitation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_admin_on_report() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_new_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_contact_form(text, text, text, text, text) TO anon, authenticated;