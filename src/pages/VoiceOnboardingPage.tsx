import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, Square, RotateCcw, ArrowRight, CheckCircle, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const GOAL_SECONDS = 45;
const MIN_SECONDS = 20;
const GOOD_MIN = 30;
const GOOD_MAX = 60;

const EXAMPLE_TEXTS_DE = [
  "Hallo, ich teste gerade meine Stimme für diese App. Ich möchte, dass sie natürlich und klar klingt, damit andere mich gut verstehen können.",
  "Ich möchte, dass meine Stimme natürlich klingt. Deshalb spreche ich jetzt einen kleinen Text ein, um mein Stimmprofil zu erstellen.",
  "Das ist ein Beispiel, damit andere mich später hören können. Ich erzähle einfach ein bisschen, wie mein Tag heute war und was ich vorhabe.",
  "Guten Tag! Ich erstelle gerade mein Stimmprofil. Ich spreche ruhig und deutlich, damit die Aufnahme möglichst gut wird.",
  "Ich freue mich, diese App zu nutzen. Mit meiner Stimme können andere meine Nachrichten so hören, wie ich sie spreche.",
];

const EXAMPLE_TEXTS_EN = [
  "Hello, I'm testing my voice for this app right now. I want it to sound natural and clear so others can understand me well.",
  "I want my voice to sound natural. That's why I'm recording a short text now to create my voice profile.",
  "This is an example so others can hear me later. I'll just talk a bit about how my day has been and what I have planned.",
  "Good day! I'm creating my voice profile right now. I'm speaking calmly and clearly so the recording turns out well.",
  "I'm excited to use this app. With my voice, others can hear my messages the way I actually speak them.",
];

const VOICE_ONBOARDING_KEY = "clemio_voice_onboarding_done";

const VoiceOnboardingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { locale, t } = useI18n();
  const isDE = locale === "de";

  const [phase, setPhase] = useState<"intro" | "recording" | "done">("intro");
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [exampleText] = useState(() => {
    const texts = isDE ? EXAMPLE_TEXTS_DE : EXAMPLE_TEXTS_EN;
    return texts[Math.floor(Math.random() * texts.length)];
  });
  const [finalDuration, setFinalDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (!user) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size === 0) {
          toast.error(isDE ? "Aufnahme leer" : "Recording empty");
          setIsRecording(false);
          return;
        }

        setFinalDuration(elapsed);
        setIsRecording(false);
        setUploading(true);

        try {
          const filePath = `${user.id}/${user.id}.wav`;
          const { error: uploadErr } = await supabase.storage
            .from("stimmen")
            .upload(filePath, blob, { upsert: true, contentType: "audio/wav" });
          if (uploadErr) throw uploadErr;

          const { error: dbErr } = await supabase
            .from("voice_secrets")
            .upsert({ user_id: user.id, voice_path: filePath } as any, { onConflict: "user_id" });
          if (dbErr) throw dbErr;

          setPhase("done");
          toast.success(isDE ? "Stimme gespeichert ✓" : "Voice saved ✓");
        } catch (err: any) {
          console.error("Voice upload error:", err);
          toast.error(
            `${isDE ? "Upload fehlgeschlagen" : "Upload failed"}: ${err?.message || "Unknown"}`
          );
          setPhase("recording");
        }
        setUploading(false);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      setElapsed(0);
      setIsRecording(true);
      setPhase("recording");

      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 250);
    } catch {
      toast.error(isDE ? "Mikrofon-Zugriff verweigert" : "Microphone access denied");
    }
  }, [user, isDE, elapsed]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      // Capture elapsed before stop triggers onstop
      setElapsed((prev) => {
        setFinalDuration(prev);
        return prev;
      });
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleContinue = () => {
    localStorage.setItem(VOICE_ONBOARDING_KEY, "true");
    navigate("/chats", { replace: true });
  };

  const handleSkip = () => {
    localStorage.setItem(VOICE_ONBOARDING_KEY, "true");
    navigate("/chats", { replace: true });
  };

  const handleRetry = () => {
    setPhase("recording");
    setElapsed(0);
    setFinalDuration(0);
    startRecording();
  };

  // Progress ring calculations
  const progress = Math.min(elapsed / GOAL_SECONDS, 1);
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference * (1 - progress);

  const isInGoodZone = elapsed >= GOOD_MIN && elapsed <= GOOD_MAX;
  const isTooShort = !isRecording && finalDuration > 0 && finalDuration < MIN_SECONDS;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const ringColor = () => {
    if (isInGoodZone) return "hsl(var(--success))";
    if (elapsed > GOOD_MAX) return "hsl(var(--accent))";
    return "hsl(var(--primary))";
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden">
      {/* Ambient glow */}
      {isRecording && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
          style={{
            background: `radial-gradient(circle at 50% 40%, hsl(var(--primary) / 0.12) 0%, transparent 70%)`,
          }}
        />
      )}

      {/* ========== INTRO ========== */}
      {phase === "intro" && (
        <div className="w-full max-w-md animate-fade-in text-center space-y-8">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 rounded-full gradient-primary flex items-center justify-center shadow-lg animate-scale-in">
            <Mic className="w-9 h-9 text-primary-foreground" />
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {isDE ? "Erstelle deine Stimme" : "Create your voice"}
            </h1>
            <p className="text-muted-foreground text-[0.938rem] leading-relaxed">
              {isDE
                ? "Damit andere dich hören können, nimm bitte kurz deine Stimme auf."
                : "So others can hear you, please record a short voice sample."}
            </p>
          </div>

          <div className="bg-card/60 backdrop-blur rounded-2xl p-4 border border-border/50 text-left space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isDE ? "Empfehlung" : "Recommendation"}
            </p>
            <p className="text-sm text-foreground/80">
              {isDE
                ? "Sprich 30–45 Sekunden ganz natürlich. Je natürlicher du sprichst, desto besser klingt deine Stimme."
                : "Speak naturally for 30–45 seconds. The more naturally you speak, the better your voice sounds."}
            </p>
            <p className="text-xs text-muted-foreground/70">
              {isDE
                ? "Normale Alltagsgeräusche sind okay. In ruhiger Umgebung klappt es meist besser."
                : "Normal everyday sounds are fine. A quieter environment usually works better."}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={startRecording}
              className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold text-[0.938rem] shadow-soft hover:opacity-90 active:scale-[0.98] transition-all"
            >
              {isDE ? "Aufnahme starten" : "Start recording"}
            </button>
            <button
              onClick={handleSkip}
              className="w-full h-10 rounded-xl text-muted-foreground text-sm hover:text-foreground transition-colors"
            >
              {isDE ? "Später machen" : "Do it later"}
            </button>
          </div>
        </div>
      )}

      {/* ========== RECORDING ========== */}
      {phase === "recording" && (
        <div className="w-full max-w-md animate-fade-in text-center space-y-6">
          {/* Progress Ring */}
          <div className="relative mx-auto w-40 h-40">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              {/* Background ring */}
              <circle
                cx="60" cy="60" r="54"
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="5"
              />
              {/* Progress ring */}
              <circle
                cx="60" cy="60" r="54"
                fill="none"
                stroke={ringColor()}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300 ease-linear"
                style={{
                  filter: isInGoodZone ? `drop-shadow(0 0 8px ${ringColor()})` : undefined,
                }}
              />
            </svg>
            {/* Timer inside ring */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold tabular-nums tracking-tight">{formatTime(elapsed)}</span>
              {isRecording && (
                <span className="text-xs text-muted-foreground mt-1">
                  {isDE ? "Aufnahme läuft" : "Recording"}
                </span>
              )}
            </div>
            {/* Pulse glow */}
            {isRecording && (
              <div
                className="absolute inset-0 rounded-full animate-pulse pointer-events-none"
                style={{
                  boxShadow: `0 0 30px 10px hsl(var(--primary) / 0.15)`,
                }}
              />
            )}
          </div>

          {/* Status hint */}
          {isRecording && (
            <div className="space-y-1 animate-fade-in">
              {elapsed < GOOD_MIN && (
                <p className="text-sm text-muted-foreground">
                  {isDE
                    ? "Sprich bitte mindestens 30 Sekunden."
                    : "Please speak at least 30 seconds."}
                </p>
              )}
              {isInGoodZone && (
                <p className="text-sm text-[hsl(var(--success))] font-medium">
                  {isDE ? "Perfekt! Du bist im optimalen Bereich." : "Perfect! You're in the optimal range."}
                </p>
              )}
              {elapsed > GOOD_MAX && (
                <p className="text-sm text-muted-foreground">
                  {isDE ? "Super – du kannst jetzt stoppen." : "Great – you can stop now."}
                </p>
              )}
            </div>
          )}

          {/* Example text card */}
          {isRecording && (
            <div className="bg-card/60 backdrop-blur rounded-2xl p-4 border border-border/50 text-left animate-fade-in">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {isDE ? "Beispieltext zum Vorlesen" : "Example text to read"}
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed italic">
                „{exampleText}"
              </p>
            </div>
          )}

          {/* Record / Stop button */}
          <div className="pt-2">
            {isRecording ? (
              <button
                onClick={stopRecording}
                className="mx-auto flex items-center gap-2.5 h-12 px-8 rounded-2xl bg-destructive text-destructive-foreground font-semibold text-[0.938rem] shadow-soft hover:opacity-90 active:scale-[0.98] transition-all"
              >
                <Square className="w-4 h-4 fill-current" />
                {isDE ? "Stoppen" : "Stop"}
              </button>
            ) : uploading ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span className="text-sm">{isDE ? "Wird hochgeladen…" : "Uploading…"}</span>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ========== DONE ========== */}
      {phase === "done" && (
        <div className="w-full max-w-md animate-fade-in text-center space-y-8">
          <div className="mx-auto w-20 h-20 rounded-full bg-[hsl(var(--success))] flex items-center justify-center shadow-lg animate-scale-in">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold">
              {isDE ? "Stimme gespeichert ✓" : "Voice saved ✓"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isDE ? `Dauer: ${finalDuration} Sekunden` : `Duration: ${finalDuration} seconds`}
            </p>
          </div>

          {isTooShort && (
            <div className="bg-accent/10 rounded-2xl p-4 border border-accent/20 flex items-start gap-3 text-left animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/80">
                {isDE
                  ? "Für bessere Qualität sprich bitte etwas länger (mind. 30 Sek.)."
                  : "For better quality, please speak a bit longer (min. 30 sec.)."}
              </p>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              onClick={handleContinue}
              className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold text-[0.938rem] shadow-soft hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {isDE ? "Weiter" : "Continue"}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleRetry}
              className="w-full h-10 rounded-xl text-muted-foreground text-sm hover:text-foreground transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {isDE ? "Neu aufnehmen" : "Record again"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export { VOICE_ONBOARDING_KEY };
export default VoiceOnboardingPage;
