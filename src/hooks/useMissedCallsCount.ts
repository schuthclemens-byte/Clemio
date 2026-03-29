import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useMissedCallsCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchCount = async () => {
      const { count: c } = await supabase
        .from("calls")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("status", "missed")
        .eq("is_read" as any, false);
      setCount(c ?? 0);
    };

    fetchCount();

    const channel = supabase
      .channel("missed-calls-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, () => {
        fetchCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return count;
}
