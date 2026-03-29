import { supabase } from "@/integrations/supabase/client";

export interface AccessibleProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface VoiceProfileState {
  user_id: string;
  has_voice: boolean;
}

export const fetchAccessibleProfiles = async (targetIds: string[]): Promise<AccessibleProfile[]> => {
  const uniqueIds = [...new Set(targetIds.filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  const { data, error } = await supabase.rpc("get_accessible_profiles", {
    target_ids: uniqueIds,
  });

  if (error) {
    console.error("[accessibleProfiles] get_accessible_profiles failed", error);
    return [];
  }

  return (data ?? []) as AccessibleProfile[];
};

export const fetchAccessibleProfile = async (targetId: string): Promise<AccessibleProfile | null> => {
  const profiles = await fetchAccessibleProfiles([targetId]);
  return profiles[0] ?? null;
};

export const searchAccessibleProfiles = async (searchQuery: string): Promise<AccessibleProfile[]> => {
  const query = searchQuery.trim();
  if (!query) return [];

  const { data, error } = await supabase.rpc("search_profiles_by_query", {
    search_query: query,
  });

  if (error) {
    console.error("[accessibleProfiles] search_profiles_by_query failed", error);
    return [];
  }

  return (data ?? []) as AccessibleProfile[];
};

export const fetchAccessibleVoiceProfileStates = async (targetIds: string[]): Promise<VoiceProfileState[]> => {
  const uniqueIds = [...new Set(targetIds.filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  const { data, error } = await supabase.rpc("get_accessible_voice_profile_states", {
    target_ids: uniqueIds,
  });

  if (error) {
    console.error("[accessibleProfiles] get_accessible_voice_profile_states failed", error);
    return [];
  }

  return (data ?? []) as VoiceProfileState[];
};
