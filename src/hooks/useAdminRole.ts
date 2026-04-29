import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useAdminRole = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const check = async () => {
      const { data, error } = await (supabase as any).rpc("is_current_user_admin");
      if (error) {
        console.error("[useAdminRole] Failed to check admin role:", error.message);
      }
      setIsAdmin(data === true);
      setLoading(false);
    };

    check();
  }, [user?.id]);

  return { isAdmin, loading };
};
