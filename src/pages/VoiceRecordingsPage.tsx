import { useEffect, useState } from "react";
import { ArrowLeft, Mic, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { useSmartBack } from "@/hooks/useSmartBack";
import { toast } from "sonner";
import VoiceCloneUpload from "@/components/voice/VoiceCloneUpload";

interface VoiceProfile {
  id: string;
  voice_name: string | null;
  elevenlabs_voice_id: string;
  created_at: string | null;
}

const VoiceRecordingsPage = () => {
  const { goBack, swipeHandlers } = useSmartBack("/settings");
  const { user } = useAuth();
  const { locale } = useI18n();
  const [myVoice, setMyVoice] = useState<VoiceProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const tr = (de: string, en: string) => (locale === "de" ? de : en);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("voice_profiles")
      .select("id, voice_name, elevenlabs_voice_id, created_at")
      .eq("user_id", user.id)
      .maybeSingle();
    setMyVoice(data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user]);

  const handleDeleteMyVoice = async () => {
    if (!user || !myVoice) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-voice`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ elevenlabs_voice_id: myVoice.elevenlabs_voice_id }),
        }
      );
      if (!response.ok) throw new Error("Delete failed");
      setMyVoice(null);
      toast.success(tr("Stimmprofil gelöscht", "Voice profile deleted"));
    } catch {
      toast.error(tr("Fehler beim Löschen", "Error deleting"));
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString(locale === "de" ? "de-DE" : "en-US", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background" {...useSwipeBack({ fallbackPath: "/chats" })}>
      <header className="sticky top-0 z-10 bg-card/90 glass border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{tr("Stimmprofil", "Voice Profile")}</h1>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <section className="animate-reveal-up">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
                {tr("Meine Stimme", "My Voice")}
              </label>
              {myVoice ? (
                <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                      <Mic className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[0.938rem] truncate">
                        {myVoice.voice_name || tr("Meine Stimme", "My Voice")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tr("Erstellt am", "Created on")} {formatDate(myVoice.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={handleDeleteMyVoice}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <VoiceCloneUpload existingVoice={null} onCloned={loadData} />
              )}
            </section>

            <section className="animate-reveal-up" style={{ animationDelay: "100ms" }}>
              <div className="bg-secondary/50 rounded-2xl p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  {tr(
                    "🔐 Dein Stimmprofil ist nur an dein Konto gebunden. Andere können Nachrichten in deiner Stimme hören, aber deine Stimme nicht herunterladen oder kopieren.",
                    "🔐 Your voice profile is bound to your account only. Others can hear messages in your voice, but cannot download or copy it."
                  )}
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default VoiceRecordingsPage;
