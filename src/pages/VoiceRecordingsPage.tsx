import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, Trash2, Play, Square, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAccessibleProfiles } from "@/lib/accessibleProfiles";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import VoiceCloneUpload from "@/components/voice/VoiceCloneUpload";

interface VoiceProfile {
  id: string;
  voice_name: string | null;
  elevenlabs_voice_id: string;
  created_at: string | null;
  sample_url: string | null;
}

interface ContactVoiceProfile {
  id: string;
  contact_user_id: string;
  voice_name: string | null;
  elevenlabs_voice_id: string;
  created_at: string | null;
  sample_url: string | null;
  contactName?: string;
}

const VoiceRecordingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const [myVoice, setMyVoice] = useState<VoiceProfile | null>(null);
  const [contactVoices, setContactVoices] = useState<ContactVoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const [myRes, contactRes] = await Promise.all([
      supabase
        .from("voice_profiles")
        .select("id, voice_name, elevenlabs_voice_id, created_at, sample_url")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("contact_voice_profiles")
        .select("id, contact_user_id, voice_name, elevenlabs_voice_id, created_at, sample_url")
        .eq("user_id", user.id),
    ]);

    if (myRes.data) setMyVoice(myRes.data);
    else setMyVoice(null);

    if (contactRes.data && contactRes.data.length > 0) {
      // Load contact names
      const contactIds = contactRes.data.map((c) => c.contact_user_id);
      const profiles = await fetchAccessibleProfiles(contactIds);

      const nameMap = new Map(profiles?.map((p) => [p.id, p.display_name]) || []);

      setContactVoices(
        contactRes.data.map((c) => ({
          ...c,
          contactName: nameMap.get(c.contact_user_id) || "Unbekannt",
        }))
      );
    } else {
      setContactVoices([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const callDeleteVoice = async (body: Record<string, string>) => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-voice`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify(body),
      }
    );
    if (!response.ok) throw new Error("Delete failed");
  };

  const handleDeleteMyVoice = async () => {
    if (!user || !myVoice) return;
    try {
      await callDeleteVoice({
        elevenlabs_voice_id: myVoice.elevenlabs_voice_id,
        type: "own",
      });
      setMyVoice(null);
      toast.success("Stimmprofil gelöscht");
    } catch {
      toast.error("Fehler beim Löschen");
    }
  };

  const handleDeleteContactVoice = async (id: string) => {
    const voice = contactVoices.find((c) => c.id === id);
    if (!voice) return;
    try {
      await callDeleteVoice({
        elevenlabs_voice_id: voice.elevenlabs_voice_id,
        type: "contact",
        contact_voice_id: id,
      });
      setContactVoices((prev) => prev.filter((c) => c.id !== id));
      toast.success("Kontakt-Stimme gelöscht");
    } catch {
      toast.error("Fehler beim Löschen");
    }
  };

  const playAudio = (url: string, id: string) => {
    if (playingId === id) {
      audioEl?.pause();
      setPlayingId(null);
      return;
    }
    audioEl?.pause();
    const audio = new Audio(url);
    audio.onended = () => setPlayingId(null);
    audio.play();
    setAudioEl(audio);
    setPlayingId(id);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
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
          <h1 className="text-xl font-bold">Stimmaufnahmen</h1>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* My Voice Section */}
            <section className="animate-reveal-up">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
                Meine Stimme
              </label>
              {myVoice ? (
                <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                      <Mic className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[0.938rem] truncate">
                        {myVoice.voice_name || "Meine Stimme"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Erstellt am {formatDate(myVoice.created_at)}
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

            {/* Contact Voices Section */}
            <section className="animate-reveal-up" style={{ animationDelay: "100ms" }}>
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
                Kontakt-Stimmen ({contactVoices.length})
              </label>
              {contactVoices.length === 0 ? (
                <div className="bg-card rounded-2xl p-6 shadow-sm border border-border text-center">
                  <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
                    <User className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Noch keine Kontakt-Stimmen gespeichert.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tippe im Chat auf „Eigene Stimme erstellen" bei einer Sprachnachricht.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {contactVoices.map((cv) => (
                    <div
                      key={cv.id}
                      className="bg-card rounded-2xl p-4 shadow-sm border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {cv.contactName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {cv.voice_name || "Stimmprobe"} · {formatDate(cv.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {cv.sample_url && (
                            <button
                              onClick={() => playAudio(cv.sample_url!, cv.id)}
                              className="w-9 h-9 rounded-full flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
                            >
                              {playingId === cv.id ? (
                                <Square className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteContactVoice(cv.id)}
                            className="w-9 h-9 rounded-full flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Info */}
            <section className="animate-reveal-up" style={{ animationDelay: "200ms" }}>
              <div className="bg-secondary/50 rounded-2xl p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  🔐 Alle Stimmprofile werden sicher gespeichert und können jederzeit gelöscht werden.
                  Sprachnachrichten im Chat werden im verschlüsselten Speicher abgelegt.
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
