import { useState, useEffect } from "react";
import { useSmartBack } from "@/hooks/useSmartBack";
import { ArrowLeft, Ban, UserX } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BlockedProfile {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  avatar_url: string | null;
}

const BlockedUsersPage = () => {
  const goBack = useSmartBack();
  const { t } = useI18n();
  const [blocked, setBlocked] = useState<BlockedProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBlocked();
  }, []);

  const loadBlocked = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_blocked_profiles");
    if (!error && data) setBlocked(data as BlockedProfile[]);
    setLoading(false);
  };

  const handleUnblock = async (userId: string) => {
    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("user_id", userId);

    if (error) {
      toast.error(t("blocked.unblockError"));
      return;
    }

    setBlocked((prev) => prev.filter((b) => b.user_id !== userId));
    toast.success(t("blocked.unblocked"));
  };

  const getName = (b: BlockedProfile) =>
    b.display_name || b.first_name || t("call.unknown");

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <button onClick={goBack} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">{t("settings.blockedUsers")}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : blocked.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <UserX className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{t("blocked.empty")}</p>
          </div>
        ) : (
          blocked.map((b) => (
            <div key={b.user_id} className="bg-card rounded-2xl shadow-sm p-4 flex items-center gap-3">
              {b.avatar_url ? (
                <img src={b.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Ban className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <span className="flex-1 font-medium text-sm truncate">{getName(b)}</span>
              <button
                onClick={() => handleUnblock(b.user_id)}
                className="px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors active:scale-[0.97]"
              >
                {t("blocked.unblock")}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BlockedUsersPage;
