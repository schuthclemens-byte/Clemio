import { useEffect, useState } from "react";
import { ArrowLeft, Mic, Trash2, Clock, CheckCircle } from "lucide-react";
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
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden" {...swipeHandlers}>
      {/* Subtle static background accent – no animation */}
      <div
        className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-[0.07] pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent 70%)" }}
      />
      <div
        className="absolute bottom-20 left-0 w-56 h-56 rounded-full opacity-[0.05] pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--accent)), transparent 70%)" }}
      />
      <header className="sticky top-0 z-10 bg-card/90 glass border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={goBack}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">{tr("Meine Stimme", "My Voice")}</h1>
            <p className="text-xs text-muted-foreground">
              {myVoice
                ? tr("Aktiv und bereit", "Active and ready")
                : tr("Noch nicht eingerichtet", "Not set up yet")}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Main voice section */}
            <section className="animate-reveal-up">
              {myVoice ? (
                <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shrink-0 shadow-soft">
                      <Mic className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-base truncate">
                          {myVoice.voice_name || tr("Meine Stimme", "My Voice")}
                        </p>
                        <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {tr("Erstellt am", "Created on")} {formatDate(myVoice.created_at)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tr(
                          "Deine Kontakte können Nachrichten in deiner Stimme hören.",
                          "Your contacts can hear messages in your voice."
                        )}
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

            {/* How it works – only show when no voice yet */}
            {!myVoice && (
              <section className="animate-reveal-up" style={{ animationDelay: "80ms" }}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                  {tr("So funktioniert es", "How it works")}
                </p>
                <div className="space-y-2.5">
                  {[
                    {
                      step: "1",
                      title: tr("30 Sekunden frei sprechen", "30 seconds of free speech"),
                      desc: tr("Erzähl einfach etwas – egal was.", "Just talk about anything."),
                    },
                    {
                      step: "2",
                      title: tr("Kurzen Satz vorlesen", "Read a short sentence"),
                      desc: tr("Zur Verifizierung deiner Stimme.", "To verify your voice."),
                    },
                    {
                      step: "✓",
                      title: tr("Fertig!", "Done!"),
                      desc: tr("Dein Stimmprofil ist sofort aktiv.", "Your voice profile is active immediately."),
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 bg-card rounded-xl p-3.5 border border-border/50">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">{item.step}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-tight">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Security hint – subtle */}
            <section className="animate-reveal-up" style={{ animationDelay: "160ms" }}>
              <div className="flex items-center gap-2 px-1 py-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                <p className="text-[0.688rem] text-muted-foreground/80">
                  {tr(
                    myVoice
                      ? "Dein Stimmprofil ist sicher an dein Konto gebunden und kann jederzeit gelöscht werden."
                      : "Dauert ca. 1 Minute · Deine Stimme bleibt privat und sicher",
                    myVoice
                      ? "Your voice profile is securely linked to your account and can be deleted anytime."
                      : "Takes about 1 minute · Your voice stays private and secure"
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
