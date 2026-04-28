-- Revoke default PUBLIC/anonymous execution from SECURITY DEFINER functions that require auth or internal use.
REVOKE ALL ON FUNCTION public.accept_message_request(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.block_message_request(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_direct_chat(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decline_message_request(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ensure_current_profile(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_accessible_profiles(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_accessible_voice_profile_states(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_blocked_profiles() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_message_request_preview(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_security_email(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_app_error_report(text, text, text, jsonb, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_messages_read(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.match_contacts_by_phone(text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_voice_consent(uuid) FROM PUBLIC, anon;

-- Restore the authenticated/app-facing grants explicitly.
GRANT EXECUTE ON FUNCTION public.accept_message_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.block_message_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_direct_chat(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_message_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_current_profile(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accessible_profiles(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accessible_voice_profile_states(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_blocked_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_message_request_preview(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_security_email(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_app_error_report(text, text, text, jsonb, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_messages_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_contacts_by_phone(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_voice_consent(uuid) TO authenticated;

-- Keep the public contact form RPC callable; it contains server-side validation and rate limiting.
GRANT EXECUTE ON FUNCTION public.submit_contact_form(text, text, text, text, text) TO anon, authenticated;