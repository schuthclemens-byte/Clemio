import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CallCaptionsValue {
  enabled?: boolean;
  native_only?: boolean;
  translation_enabled?: boolean;
}

export const useCallCaptionsFeature = () => {
  const [enabled, setEnabled] = useState(false);
  const [nativeOnly, setNativeOnly] = useState(true);
  const [translationEnabled, setTranslationEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const applyValue = (value: CallCaptionsValue | null | undefined) => {
      setEnabled(Boolean(value?.enabled));
      setNativeOnly(value?.native_only !== false);
      setTranslationEnabled(value?.translation_enabled !== false);
    };

    const load = async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "call_captions")
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error("[useCallCaptionsFeature] Failed to load:", error.message);
        applyValue(null);
      } else {
        applyValue((data?.value as CallCaptionsValue | null) ?? null);
      }
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel(`app_settings_call_captions_${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_settings",
          filter: "key=eq.call_captions",
        },
        (payload) => {
          const newRow = (payload.new ?? null) as { value?: CallCaptionsValue } | null;
          if (newRow?.value) {
            applyValue(newRow.value);
          } else if (payload.eventType === "DELETE") {
            applyValue(null);
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { enabled, nativeOnly, translationEnabled, loading };
};