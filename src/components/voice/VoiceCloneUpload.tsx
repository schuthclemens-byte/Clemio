import { useState, useRef, useEffect } from "react";
import { Mic, Loader2, CheckCircle, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import VoiceConsentPopup from "./VoiceConsentPopup";

interface VoiceCloneUploadProps {
  existingVoice?: { voice_name: string; elevenlabs_voice_id: string } | null;
  onCloned: () => void;
}

const VoiceCloneUpload = ({ existingVoice, onCloned }: VoiceCloneUploadProps) => {
  const { user } = useAuth();
  const { locale } = useI18n();
  const [phase, setPhase] = useState<"idle" | "consent" | "recording" | "processing" | "done">("idle");
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const tr = (de: string, en: string) => (locale === "de" ? de : en);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        handleUpload();
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setPhase("recording");
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        toast.error(tr("Mikrofon-Zugriff verweigert. Bitte erlaube den Zugriff in deinen Geräteeinstellungen.", "Microphone access denied. Please allow access in your device settings."));
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        toast.error(tr("Kein Mikrofon gefunden. Bitte schließe ein Mikrofon an.", "No microphone found. Please connect a microphone."));
      } else {
        toast.error(tr("Mikrofon konnte nicht aktiviert werden.", "Microphone could not be activated."));
      }
      setPhase("idle");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleUpload = async () => {
    if (!user) return;
    setPhase("processing");

    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const file = new File([blob], "voice-sample.webm", { type: "audio/webm" });

      const formData = new FormData();
      formData.append("audio", file);
      formData.append("name", user.user_metadata?.display_name || "Meine Stimme");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-clone`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || tr("Fehler", "Error"));
      }

      setPhase("done");
      toast.success(tr("Deine Stimme ist bereit! 🎉", "Your voice is ready! 🎉"));
      onCloned();
    } catch (error: any) {
      toast.error(error.message || tr("Etwas ist schiefgelaufen", "Something went wrong"));
      setPhase("idle");
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const minSeconds = 30;

  // Already has a voice
  if (existingVoice || phase === "done") {
    return (
      <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-accent" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-[0.938rem]">{tr("Deine Stimme ist aktiv ✨", "Your voice is active ✨")}</p>
            <p className="text-xs text-muted-foreground">
              {tr("Deine Kontakte können Nachrichten in deiner Stimme hören", "Your contacts can hear messages in your voice")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Processing
  if (phase === "processing") {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
          <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
        </div>
        <div>
          <p className="font-semibold text-[0.938rem]">{tr("Einen Moment...", "One moment...")}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {tr("Deine Stimme wird gerade eingerichtet", "Your voice is being prepared")}
          </p>
        </div>
      </div>
    );
  }

  // Recording
  if (phase === "recording") {
    const canStop = seconds >= minSeconds;
    return (
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border text-center space-y-4">
        {/* Pulsing mic */}
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-destructive flex items-center justify-center">
            <Mic className="w-8 h-8 text-destructive-foreground" />
          </div>
        </div>

        <div>
          <p className="text-2xl font-bold tabular-nums">{formatTime(seconds)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {canStop
              ? tr("Du kannst jetzt aufhören – oder weitersprechen für bessere Qualität", "You can stop now — or keep talking for better quality")
              : tr("Erzähl einfach etwas über deinen Tag...", "Just talk a little about your day...")
            }
          </p>
        </div>

        {/* Progress bar to 30s */}
        <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-1000",
              canStop ? "bg-accent" : "bg-primary"
            )}
            style={{ width: `${Math.min(100, (seconds / minSeconds) * 100)}%` }}
          />
        </div>

        <button
          onClick={stopRecording}
          disabled={!canStop}
          className={cn(
            "w-full h-14 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.97]",
            canStop
              ? "gradient-primary text-primary-foreground shadow-soft hover:shadow-elevated"
              : "bg-secondary text-muted-foreground cursor-not-allowed"
          )}
        >
            {canStop ? tr("Fertig", "Done") : tr(`Noch ${minSeconds - seconds} Sekunden...`, `${minSeconds - seconds} seconds left...`)}
        </button>
      </div>
    );
  }

  // Consent popup
  if (phase === "consent") {
    return (
      <>
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto shadow-soft">
            <Mic className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold text-lg">{tr("Lass dich hören", "Let yourself be heard")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {tr("Bitte bestätige die Einwilligung, um fortzufahren", "Please confirm consent to continue")}
            </p>
          </div>
        </div>
        <VoiceConsentPopup
          open={true}
          onAccept={() => {
            setPhase("idle");
            startRecording();
          }}
          onCancel={() => setPhase("idle")}
        />
      </>
    );
  }

  // Idle – single CTA
  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto shadow-soft">
        <Mic className="w-8 h-8 text-primary-foreground" />
      </div>
      <div>
        <p className="font-semibold text-lg">{tr("Lass dich hören", "Let yourself be heard")}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {tr("Sprich 30 Sekunden – und deine Kontakte hören Nachrichten in deiner Stimme", "Speak for 30 seconds — and your contacts can hear messages in your voice")}
        </p>
      </div>
      <button
        onClick={() => setPhase("consent")}
        className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-bold text-base shadow-soft hover:shadow-elevated transition-all active:scale-[0.97]"
      >
        {tr("Eigene Stimme erstellen", "Create your own voice")}
      </button>
      <p className="text-[0.688rem] text-muted-foreground">
        {tr("🔐 Stimmen werden nur mit deiner Zustimmung verwendet und können jederzeit gelöscht werden.", "🔐 Voices are only used with your consent and can be deleted at any time.")}
      </p>
    </div>
  );
};

export default VoiceCloneUpload;
