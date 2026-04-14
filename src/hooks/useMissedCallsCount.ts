import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useMissedCallsCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchCount = async () => {
      const { data, error } = await (supabase as any)
        .from("calls")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("status", "missed")
        .eq("is_read", false);
      if (!error) {
        // When head: true, count is in the response
        setCount((data as any)?.length ?? 0);
      }
    };

    // Use raw count approach
    const fetchCountRaw = async () => {
      const { count: c, error } = await (supabase as any)
        .from("calls")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("status", "missed")
        .eq("is_read", false);
      if (!error) setCount(c ?? 0);
    };

    fetchCountRaw();

    const channelName = `missed-calls-badge-${user.id}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, () => {
        fetchCountRaw();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return count;
}
