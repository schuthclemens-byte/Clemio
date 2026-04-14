import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Loader2, CheckCircle, AlertTriangle, RotateCcw } from "lucide-react";
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

const VERIFICATION_SENTENCES: Record<string, string[]> = {
  de: [
    "Die Sonne scheint heute besonders hell und ich genieße den Spaziergang durch den Park.",
    "Mein Lieblingsbuch handelt von einer Reise um die ganze Welt in achtzig Tagen.",
    "Am Wochenende backe ich gerne frischen Kuchen für meine Familie und Freunde.",
    "Der Zug fährt pünktlich um halb neun vom Hauptbahnhof in Richtung München ab.",
    "Im Sommer fahren wir ans Meer und sammeln bunte Muscheln am Strand.",
  ],
  en: [
    "The sun is shining especially bright today and I am enjoying my walk through the park.",
    "My favorite book is about a journey around the whole world in eighty days.",
    "On weekends I like to bake fresh cake for my family and friends.",
    "The train departs punctually at half past eight from the main station heading to the city.",
    "In summer we drive to the sea and collect colorful shells on the beach.",
  ],
};

type Phase = "idle" | "consent" | "preparing" | "recording_free" | "recording_sentence" | "processing" | "done" | "error";

const VoiceCloneUpload = ({ existingVoice, onCloned }: VoiceCloneUploadProps) => {
  const { user } = useAuth();
  const { locale } = useI18n();
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [verificationSentence, setVerificationSentence] = useState("");
  const verificationSentenceRef = useRef("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const freeSpeechBlobRef = useRef<Blob | null>(null);

  const tr = useCallback((de: string, en: string) => (locale === "de" ? de : en), [locale]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const pickSentence = () => {
    const lang = locale === "de" ? "de" : "en";
    const sentences = VERIFICATION_SENTENCES[lang] || VERIFICATION_SENTENCES.en;
    return sentences[Math.floor(Math.random() * sentences.length)];
  };

  const startRecording = async (onStop: () => void) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        onStop();
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err: any) {
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        toast.error(tr("Mikrofon-Zugriff verweigert.", "Microphone access denied."));
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

  // Phase: Start free speech recording
  const beginFreeSpeech = () => {
    setPhase("recording_free");
    startRecording(() => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      freeSpeechBlobRef.current = blob;
      const sentence = pickSentence();
      verificationSentenceRef.current = sentence;
      setVerificationSentence(sentence);
      setPhase("recording_sentence");
      // Auto-start sentence recording after brief pause
      setTimeout(() => {
        startRecording(() => {
          handleUpload();
        });
      }, 500);
    });
  };

  const handleUpload = async () => {
    if (!user || !freeSpeechBlobRef.current) return;
    setPhase("processing");

    try {
      const sentenceBlob = new Blob(chunksRef.current, { type: "audio/webm" });
      const freeSpeechFile = new File([freeSpeechBlobRef.current], "free-speech.webm", { type: "audio/webm" });
      const sentenceFile = new File([sentenceBlob], "sentence.webm", { type: "audio/webm" });

      const formData = new FormData();
      formData.append("free_speech", freeSpeechFile);
      formData.append("sentence_audio", sentenceFile);
      formData.append("expected_sentence", verificationSentenceRef.current);
      formData.append("name", user.user_metadata?.display_name || "Meine Stimme");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-and-clone-voice`,
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
        if (err.error === "sentence_mismatch") {
          setErrorMsg(tr(
            "Der gesprochene Satz stimmt nicht überein. Bitte lies den Satz genau vor.",
            "The spoken sentence doesn't match. Please read the sentence exactly."
          ));
          setPhase("error");
          return;
        }
        if (err.error === "speaker_mismatch") {
          setErrorMsg(tr(
            "Die Stimmen in den beiden Aufnahmen scheinen nicht übereinzustimmen. Bitte versuche es erneut.",
            "The voices in the two recordings don't seem to match. Please try again."
          ));
          setPhase("error");
          return;
        }
        throw new Error(err.error || tr("Fehler", "Error"));
      }

      setPhase("done");
      toast.success(tr("Deine Stimme ist bereit! 🎉", "Your voice is ready! 🎉"));
      onCloned();
    } catch (error: any) {
      setErrorMsg(error.message || tr("Etwas ist schiefgelaufen", "Something went wrong"));
      setPhase("error");
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const minSeconds = 30;

  const reset = () => {
    freeSpeechBlobRef.current = null;
    setErrorMsg("");
    setPhase("idle");
  };

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

  // Error state
  if (phase === "error") {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-destructive/30 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <div>
          <p className="font-semibold text-[0.938rem]">{tr("Verifizierung fehlgeschlagen", "Verification failed")}</p>
          <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
        </div>
        <button
          onClick={reset}
          className="w-full h-14 rounded-2xl bg-secondary text-foreground font-semibold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
        >
          <RotateCcw className="w-4 h-4" />
          {tr("Erneut versuchen", "Try again")}
        </button>
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
          <p className="font-semibold text-[0.938rem]">{tr("Stimme wird verifiziert & erstellt...", "Verifying & creating voice...")}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {tr("Das kann bis zu 30 Sekunden dauern", "This may take up to 30 seconds")}
          </p>
        </div>
      </div>
    );
  }

  // Recording sentence (step 2)
  if (phase === "recording_sentence") {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border text-center space-y-4">
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-full gradient-primary flex items-center justify-center">
            <Mic className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
            {tr("Schritt 2 – Satz vorlesen", "Step 2 – Read the sentence")}
          </p>
          <p className="text-2xl font-bold tabular-nums">{formatTime(seconds)}</p>
        </div>

        <div className="bg-muted/50 rounded-xl p-4 border border-border">
          <p className="text-xs text-muted-foreground mb-1">{tr("Bitte lies vor:", "Please read aloud:")}</p>
          <p className="text-sm font-medium text-foreground leading-relaxed">„{verificationSentence}"</p>
        </div>

        <button
          onClick={stopRecording}
          disabled={seconds < 3}
          className={cn(
            "w-full h-14 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.97]",
            seconds >= 3
              ? "gradient-primary text-primary-foreground shadow-soft hover:shadow-elevated"
              : "bg-secondary text-muted-foreground cursor-not-allowed"
          )}
        >
          {seconds >= 3 ? tr("Fertig", "Done") : tr("Spreche den Satz...", "Read the sentence...")}
        </button>
      </div>
    );
  }

  // Recording free speech (step 1)
  if (phase === "recording_free") {
    const canStop = seconds >= minSeconds;
    return (
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border text-center space-y-4">
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-destructive flex items-center justify-center">
            <Mic className="w-8 h-8 text-destructive-foreground" />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-destructive uppercase tracking-wide mb-2">
            {tr("Schritt 1 – Frei sprechen", "Step 1 – Free speech")}
          </p>
          <p className="text-2xl font-bold tabular-nums">{formatTime(seconds)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {canStop
              ? tr("Du kannst jetzt aufhören – oder weitersprechen für bessere Qualität", "You can stop now — or keep talking for better quality")
              : tr("Erzähl einfach etwas über deinen Tag...", "Just talk a little about your day...")}
          </p>
        </div>

        <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-1000", canStop ? "bg-accent" : "bg-primary")}
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
          {canStop ? tr("Weiter zu Schritt 2", "Continue to step 2") : tr(`Noch ${minSeconds - seconds} Sekunden...`, `${minSeconds - seconds} seconds left...`)}
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
            <p className="font-bold text-xl">{tr("Meine Stimme", "My Voice")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {tr("Bitte bestätige die Einwilligung, um fortzufahren", "Please confirm consent to continue")}
            </p>
          </div>
        </div>
        <VoiceConsentPopup
          open={true}
          onAccept={() => {
            setPhase("preparing");
            setTimeout(() => {
              beginFreeSpeech();
            }, 800);
          }}
          onCancel={() => setPhase("idle")}
        />
      </>
    );
  }

  // Preparing – brief transition before recording starts
  if (phase === "preparing") {
    return (
      <div className="bg-card rounded-2xl p-8 shadow-sm border border-border text-center space-y-4 animate-reveal-up">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-2xl gradient-primary opacity-30 animate-pulse" />
          <div className="relative w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-soft">
            <Mic className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>
        <div>
          <p className="font-bold text-base">{tr("Wird vorbereitet…", "Preparing…")}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {tr("Mikrofon wird aktiviert", "Activating microphone")}
          </p>
        </div>
      </div>
    );
  }

  // Idle – CTA
  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto shadow-soft">
        <Mic className="w-8 h-8 text-primary-foreground" />
      </div>
      <div>
        <p className="font-bold text-xl">{tr("Meine Stimme", "My Voice")}</p>
        <p className="text-sm text-muted-foreground mt-1.5">
          {tr(
            "Andere können deine Nachrichten in deiner Stimme hören.",
            "Others can hear your messages in your voice."
          )}
        </p>
        <div className="flex items-center justify-center gap-3 mt-3">
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-3 py-1">
            {tr("⏱ ca. 1 Minute", "⏱ ~1 minute")}
          </span>
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-3 py-1">
            {tr("📌 Noch nicht eingerichtet", "📌 Not set up yet")}
          </span>
        </div>
      </div>
      <button
        onClick={() => setPhase("consent")}
        className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-bold text-base shadow-soft hover:shadow-elevated transition-all duration-200 active:scale-[0.95]"
      >
        {tr("Stimmprofil einrichten", "Set up voice profile")}
      </button>
    </div>
  );
};

export default VoiceCloneUpload;
