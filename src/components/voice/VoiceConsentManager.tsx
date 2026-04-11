import { useState, useEffect } from "react";
import { ShieldCheck, ShieldX, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAccessibleProfile } from "@/lib/accessibleProfiles";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ConsentRequest {
  id: string;
  granted_to_user_id: string;
  status: string;
  created_at: string;
  requester_name?: string;
}

const VoiceConsentManager = () => {
  const { user } = useAuth();
  const { locale } = useI18n();
  const [requests, setRequests] = useState<ConsentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const tr = (de: string, en: string) => (locale === "de" ? de : en);

  const loadRequests = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("voice_consents" as any)
      .select("*")
      .eq("voice_owner_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      const enriched = await Promise.all(
        (data as any[]).map(async (r: any) => {
          const profile = await fetchAccessibleProfile(r.granted_to_user_id);
          return {
            id: r.id,
            granted_to_user_id: r.granted_to_user_id,
            status: r.status,
            created_at: r.created_at,
            requester_name: profile?.display_name || tr("Unbekannt", "Unknown"),
          } as ConsentRequest;
        })
      );
      setRequests(enriched);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, [user]);

  const handleConsent = async (id: string, status: "granted" | "denied") => {
    const { error } = await supabase
      .from("voice_consents" as any)
      .update({ status, updated_at: new Date().toISOString() } as any)
      .eq("id", id);

    if (error) {
      console.error("[VoiceConsentManager] update error", error);
      toast.error(tr("Fehler beim Aktualisieren", "Failed to update"));
      return;
    }

    toast.success(status === "granted" ? tr("Zustimmung erteilt ✓", "Permission granted ✓") : tr("Abgelehnt", "Declined"));
    loadRequests();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-5 shadow-sm border border-border text-center">
        <p className="text-sm text-muted-foreground">{tr("Keine Stimmfreigabe-Anfragen", "No voice permission requests")}</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
      {requests.map((req, i) => (
        <div
          key={req.id}
          className={cn(
            "flex items-center justify-between p-4",
            i < requests.length - 1 && "border-b border-border"
          )}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {req.status === "granted" ? (
              <ShieldCheck className="w-5 h-5 text-accent shrink-0" />
            ) : req.status === "denied" ? (
              <ShieldX className="w-5 h-5 text-destructive shrink-0" />
            ) : (
              <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-[0.938rem] font-medium truncate">{req.requester_name}</p>
              <p className="text-xs text-muted-foreground">
                {req.status === "granted"
                  ? tr("Darf deine Stimme hören", "Can hear your voice")
                  : req.status === "denied"
                  ? tr("Abgelehnt", "Declined")
                  : tr("Wartet auf Zustimmung", "Waiting for approval")}
              </p>
            </div>
          </div>

          {req.status === "pending" && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleConsent(req.id, "granted")}
                className="h-9 px-3 rounded-xl bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-colors active:scale-95"
              >
                {tr("Erlauben", "Allow")}
              </button>
              <button
                onClick={() => handleConsent(req.id, "denied")}
                className="h-9 px-3 rounded-xl bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors active:scale-95"
              >
                {tr("Ablehnen", "Decline")}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default VoiceConsentManager;
