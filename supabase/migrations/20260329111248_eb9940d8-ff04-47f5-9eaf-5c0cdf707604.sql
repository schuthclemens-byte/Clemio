REVOKE ALL ON FUNCTION public.search_profiles_by_query(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_profiles_by_query(text) TO authenticated;

REVOKE ALL ON FUNCTION public.get_accessible_profiles(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_accessible_profiles(uuid[]) TO authenticated;

REVOKE ALL ON FUNCTION public.get_accessible_voice_profile_states(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_accessible_voice_profile_states(uuid[]) TO authenticated;