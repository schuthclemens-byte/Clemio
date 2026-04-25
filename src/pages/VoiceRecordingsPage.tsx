import { useEffect, useState } from "react";
import { ArrowLeft, Mic, Trash2, Shield, CheckCircle, Sparkles } from "lucide-react";
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
  const [voicePath, setVoicePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  const tr = (de: string, en: string) => (locale === "de" ? de : en);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const [vpRes, profRes] = await Promise.all([
      supabase
        .from("voice_profiles")
        .select("id, voice_name, elevenlabs_voice_id, created_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("voice_secrets")
        .select("voice_path")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    setMyVoice(vpRes.data);
    setVoicePath((profRes.data as any)?.voice_path ?? null);
    setLoading(false);
  };

  const isVoiceConfigured = Boolean(myVoice) || Boolean(voicePath);

  useEffect(() => { loadData(); }, [user]);

  const handleDeleteMyVoice = async () => {
    if (!user) return;
    try {
      // Delete from ElevenLabs if voice profile exists
      if (myVoice?.elevenlabs_voice_id) {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-voice`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
            body: JSON.stringify({ elevenlabs_voice_id: myVoice.elevenlabs_voice_id }),
          }
        ).catch(() => {});
      }

      // Delete from storage
      if (voicePath) {
        await supabase.storage.from("stimmen").remove([voicePath]).catch(() => {});
      }

      // Clear voice secret in dedicated table
      await supabase.from("voice_secrets").delete().eq("user_id", user.id);

      setMyVoice(null);
      setVoicePath(null);
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

  // If setup flow is active, show VoiceCloneUpload full-screen
  if (showSetup && !myVoice) {
    return (
      <div className="flex flex-col min-h-screen bg-background relative overflow-hidden" {...swipeHandlers}>
        <div
          className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-[0.07] pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent 70%)" }}
        />
        <header className="sticky top-0 z-10 bg-card/90 glass border-b border-border/50">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => setShowSetup(false)}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold">{tr("Stimme einrichten", "Set up voice")}</h1>
          </div>
        </header>
        <div className="flex-1 p-4">
          <VoiceCloneUpload existingVoice={null} onCloned={() => { loadData(); setShowSetup(false); }} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden" {...swipeHandlers}>
      {/* Static background accents */}
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
              {isVoiceConfigured
                ? tr("Aktiv und bereit", "Active and ready")
                : tr("Noch keine Stimme eingerichtet", "No voice set up yet")}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : isVoiceConfigured ? (
          /* ── Voice exists ── */
          <>
            <section className="animate-reveal-up">
              <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shrink-0 shadow-soft">
                    <Mic className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-bold text-base truncate">
                        {myVoice?.voice_name || tr("Meine Stimme", "My Voice")}
                      </p>
                      <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                    </div>
                    {myVoice?.created_at && (
                      <p className="text-xs text-muted-foreground">
                        {tr("Erstellt am", "Created on")} {formatDate(myVoice.created_at)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {tr(
                        "Deine Kontakte können Nachrichten in deiner Stimme hören. Du kannst die Nutzung jederzeit durch Löschen beenden.",
                        "Your contacts can hear messages in your voice. You can stop use at any time by deleting it."
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
            </section>
            <section className="animate-reveal-up" style={{ animationDelay: "80ms" }}>
              <div className="flex items-center gap-2 px-1 py-2">
                <Shield className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                <p className="text-[0.688rem] text-muted-foreground/80">
                  {tr(
                    "Beim Löschen entfernen wir dein gespeichertes Stimmprofil inklusive ElevenLabs-Voice-ID und Stimmaufnahme.",
                    "When deleted, we remove your stored voice profile including the ElevenLabs voice ID and voice recording."
                  )}
                </p>
              </div>
            </section>
          </>
        ) : (
          /* ── No voice yet: Benefit → Steps → CTA → Security ── */
          <>
            {/* 1. Benefit / Value proposition */}
            <section className="animate-reveal-up text-center pt-2">
              <div className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center mx-auto shadow-soft mb-4">
                <Mic className="w-10 h-10 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold leading-tight">
                {tr("Lass deine Nachrichten\nmit deiner Stimme klingen", "Make your messages\nsound like you")}
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-[280px] mx-auto">
                {tr(
                  "Deine Kontakte hören deine Nachrichten in deiner echten Stimme – persönlicher geht es nicht.",
                  "Your contacts hear your messages in your real voice – it doesn't get more personal."
                )}
              </p>
            </section>

            {/* 2. Steps */}
            <section className="animate-reveal-up" style={{ animationDelay: "60ms" }}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                {tr("So funktioniert es", "How it works")}
              </p>
              <div className="space-y-2.5">
                {[
                  {
                    step: "1",
                    title: tr("Sprich 30–45 Sekunden ganz natürlich", "Speak naturally for 30–45 seconds"),
                    desc: tr("Normale Alltagsgeräusche sind okay. In ruhiger Umgebung klappt es meist besser.", "Normal everyday sounds are fine. A quieter environment usually works better."),
                    highlight: false,
                    pending: false,
                  },
                  {
                    step: "2",
                    title: tr("Kurzen Satz vorlesen", "Read a short sentence"),
                    desc: tr("Zur Verifizierung deiner Stimme.", "To verify your voice."),
                    highlight: false,
                    pending: false,
                  },
                  {
                    step: "✓",
                    title: tr("Fertig – deine Stimme ist aktiv", "Done – your voice is active"),
                    desc: tr("Ab sofort können Kontakte dich hören.", "Your contacts can hear you from now on."),
                    highlight: isVoiceConfigured,
                    pending: !isVoiceConfigured,
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 rounded-xl p-3.5 border transition-colors ${
                      item.highlight
                        ? "bg-primary/5 border-primary/20"
                        : item.pending
                          ? "bg-muted/50 border-border/30 opacity-60"
                          : "bg-card border-border/50"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        item.highlight
                          ? "gradient-primary shadow-sm"
                          : item.pending
                            ? "bg-muted"
                            : "bg-primary/10"
                      }`}
                    >
                      <span className={`text-xs font-bold ${
                        item.highlight ? "text-primary-foreground" : item.pending ? "text-muted-foreground" : "text-primary"
                      }`}>
                        {item.step}
                      </span>
                    </div>
                    <div>
                      <p className={`text-sm font-semibold leading-tight ${item.highlight ? "text-foreground" : item.pending ? "text-muted-foreground" : ""}`}>
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                    {item.highlight && (
                      <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5 ml-auto" />
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* 3. Primary CTA – large and prominent */}
            <section className="animate-reveal-up" style={{ animationDelay: "120ms" }}>
              <button
                onClick={() => setShowSetup(true)}
                className="w-full h-16 rounded-2xl gradient-primary text-primary-foreground font-bold text-lg shadow-elevated hover:shadow-soft transition-all duration-200 active:scale-[0.96] flex items-center justify-center gap-2.5"
              >
                <Mic className="w-5 h-5" />
                {tr("Jetzt einrichten", "Set up now")}
              </button>
              <p className="text-center text-xs text-muted-foreground mt-2">
                {tr("⏱ Dauert nur ca. 1 Minute", "⏱ Takes only about 1 minute")}
              </p>
            </section>

            {/* 4. Security – last, subtle */}
            <section className="animate-reveal-up" style={{ animationDelay: "180ms" }}>
              <div className="flex items-center gap-2 px-1 py-2">
                <Shield className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                <p className="text-[0.688rem] text-muted-foreground/80">
                  {tr(
                    "Deine Stimme bleibt privat und sicher – nur du kontrollierst, wer sie hört.",
                    "Your voice stays private and secure – only you control who hears it."
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
