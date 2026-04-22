import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LaunchModeValue {
  coming_soon?: boolean;
}

/**
 * Reads the global `launch_mode` flag from `app_settings` and subscribes to
 * realtime changes. Used by landing-page CTAs to switch into a "Coming Soon"
 * state without requiring a redeploy.
 */
export const useLaunchMode = () => {
  const [comingSoon, setComingSoon] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "launch_mode")
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error("[useLaunchMode] Failed to load:", error.message);
        setComingSoon(false);
      } else {
        const value = (data?.value as LaunchModeValue | null) ?? null;
        setComingSoon(Boolean(value?.coming_soon));
      }
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel(`app_settings_launch_mode_${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_settings",
          filter: "key=eq.launch_mode",
        },
        (payload) => {
          const newRow = (payload.new ?? null) as { value?: LaunchModeValue } | null;
          if (newRow && newRow.value) {
            setComingSoon(Boolean(newRow.value.coming_soon));
          } else if (payload.eventType === "DELETE") {
            setComingSoon(false);
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { comingSoon, loading };
};
