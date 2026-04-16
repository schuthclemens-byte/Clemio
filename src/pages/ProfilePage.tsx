import { useState, useEffect, useRef, useCallback } from "react";
import { useSmartBack } from "@/hooks/useSmartBack";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Crown,
  Trash2,
  Mic,
  MicOff,
  ChevronRight,
  CheckCircle,
  LogOut,
  Upload,
  Play,
  Pause,
  Square,
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { usePremiumGate } from "@/hooks/usePremiumGate";
import { Badge } from "@/components/ui/badge";
import { generateVoiceKey, encryptVoiceFile, decryptVoiceFile } from "@/lib/voiceCrypto";

const splitDisplayName = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return { firstName: "", lastName: "" };
  const [derivedFirstName = "", ...rest] = trimmedValue.split(/\s+/);
  return { firstName: derivedFirstName, lastName: rest.join(" ") };
};

const ProfilePage = () => {
  const { goBack, swipeHandlers } = useSmartBack("/chats");
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const { user, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hasVoice, setHasVoice] = useState(false);
  const [voicePath, setVoicePath] = useState<string | null>(null);
  const [voiceEncKey, setVoiceEncKey] = useState<string | null>(null);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const voiceInputRef = useRef<HTMLInputElement>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const { isPremium, isFoundingUser, planLabel, daysRemaining } = useSubscription();
  const { requirePremium, PaywallGate } = usePremiumGate();

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, phone_number, avatar_url, language, first_name, last_name, voice_path, voice_encryption_key")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        const storedDisplayName = data.display_name?.trim() || "";
        const storedFirstName = (data as any).first_name?.trim() || "";
        const storedLastName = (data as any).last_name?.trim() || "";
        const derivedName =
          !storedFirstName && !storedLastName
            ? splitDisplayName(storedDisplayName)
            : { firstName: storedFirstName, lastName: storedLastName };
        setDisplayName(storedDisplayName);
        setFirstName(derivedName.firstName);
        setLastName(derivedName.lastName);
        setPhoneNumber(data.phone_number || "");
        setAvatarUrl(data.avatar_url);
        setVoicePath((data as any).voice_path || null);
        setVoiceEncKey((data as any).voice_encryption_key || null);
      }
      const { data: voiceData } = await supabase
        .from("voice_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      setHasVoice(!!voiceData);
      setLoaded(true);
    };
    load();
  }, [user]);

  // Auto-save name with debounce
  const autoSaveName = useCallback(
    (fn: string, ln: string) => {
      if (!user || !loaded) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        const nextFirst = fn.trim();
        const nextLast = ln.trim();
        const nextDisplay = [nextFirst, nextLast].filter(Boolean).join(" ") || "Nutzer";
        const { error } = await supabase
          .from("profiles")
          .update({
            display_name: nextDisplay,
            first_name: nextFirst || null,
            last_name: nextLast || null,
            language: locale,
          })
          .eq("id", user.id);
        if (!error) {
          setDisplayName(nextDisplay);
          toast("Gespeichert ✓", { duration: 2000 });
        }
      }, 1200);
    },
    [user, loaded, locale],
  );

  // Cleanup timer
  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const updateFirstName = (val: string) => {
    setFirstName(val);
    autoSaveName(val, lastName);
  };
  const updateLastName = (val: string) => {
    setLastName(val);
    autoSaveName(firstName, val);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { data, error } = await supabase.storage.from("Stimmen").upload(path, file, {
      upsert: true,
      contentType: "audio/wav",
    });

    if (error) {
      console.error("UPLOAD ERROR:", error);
      toast.error(error.message);
      setVoiceUploading(false);
      return;
    }

    console.log("UPLOAD OK:", data);
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: newUrl }).eq("id", user.id);
    setAvatarUrl(newUrl);
    setUploading(false);
    toast.success(t("profile.avatarUpdated"));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleVoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.name.toLowerCase().endsWith(".wav")) {
      toast.error(t("profile.voiceWavOnly"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("profile.voiceFileTooLarge"));
      return;
    }
    setVoiceUploading(true);
    try {
      // 1. Generate or reuse encryption key
      let keyB64 = voiceEncKey;
      if (!keyB64) {
        keyB64 = await generateVoiceKey();
        const { error: keyErr } = await supabase
          .from("profiles")
          .update({ voice_encryption_key: keyB64 } as any)
          .eq("id", user.id);
        if (keyErr) throw keyErr;
        setVoiceEncKey(keyB64);
      }

      // 2. Encrypt the file in browser
      const encryptedBlob = await encryptVoiceFile(file, keyB64);

      // 3. Upload encrypted blob to root of bucket
      const encPath = `${user.id}.enc`;
      const { error: uploadErr } = await supabase.storage
        .from("stimmen")
        .upload(encPath, encryptedBlob, { upsert: true, contentType: "application/octet-stream" });
      if (uploadErr) {
        toast.error(`${t("profile.voiceUploadFailed")}: ${uploadErr.message}`);
        setVoiceUploading(false);
        return;
      }

      // 4. Save path in profile
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ voice_path: encPath } as any)
        .eq("id", user.id);
      if (dbErr) throw dbErr;

      setVoicePath(encPath);
      toast.success(t("profile.voiceSaved"));
    } catch (err: any) {
      console.error("Voice upload exception:", err);
      toast.error(`${t("profile.voiceUploadFailed")}: ${err?.message || "Unknown error"}`);
    }
    setVoiceUploading(false);
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      return;
    }

    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);

        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        if (blob.size === 0) {
          toast.error(locale === "de" ? "Aufnahme leer" : "Recording empty");
          return;
        }
        if (blob.size > 5 * 1024 * 1024) {
          toast.error(t("profile.voiceFileTooLarge"));
          return;
        }

        // Upload to stimmen bucket as {user_id}/{user_id}.wav
        setVoiceUploading(true);
        try {
          const filePath = `${user!.id}/${user!.id}.wav`;

          const { error: uploadErr } = await supabase.storage
            .from("stimmen")
            .upload(filePath, blob, { upsert: true, contentType: "audio/wav" });
          if (uploadErr) {
            toast.error(`${t("profile.voiceUploadFailed")}: ${uploadErr.message}`);
            setVoiceUploading(false);
            return;
          }

          const { error: dbErr } = await supabase
            .from("profiles")
            .update({ voice_path: filePath } as any)
            .eq("id", user!.id);
          if (dbErr) throw dbErr;

          setVoicePath(filePath);
          toast.success(locale === "de" ? "Aufnahme gespeichert" : "Recording saved");
        } catch (err: any) {
          console.error("Voice record upload error:", err);
          toast.error(`${t("profile.voiceUploadFailed")}: ${err?.message || "Unknown"}`);
        }
        setVoiceUploading(false);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      toast.error(locale === "de" ? "Mikrofon-Zugriff verweigert" : "Microphone access denied");
    }
  };

  const handleDeleteVoiceFile = async () => {
    if (!user || !voicePath) return;
    // Delete encrypted file
    await supabase.storage.from("stimmen").remove([`${user.id}.enc`]);
    // Also try to clean up old unencrypted file
    await supabase.storage.from("stimmen").remove([`${user.id}/${user.id}.wav`]);
    await supabase
      .from("profiles")
      .update({ voice_path: null, voice_encryption_key: null } as any)
      .eq("id", user.id);
    setVoicePath(null);
    setVoiceEncKey(null);
    toast.success(t("profile.voiceFileDeleted"));
  };

  const handlePlayVoice = async () => {
    if (!user || !voicePath) return;
    if (voicePlaying && voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      setVoicePlaying(false);
      return;
    }
    try {
      const encPath = `${user.id}.enc`;
      const { data } = await supabase.storage.from("stimmen").createSignedUrl(encPath, 60);
      if (!data?.signedUrl) {
        toast.error("Signed URL failed");
        return;
      }

      if (!voiceEncKey) {
        toast.error("Encryption key missing");
        return;
      }

      // Download encrypted data
      const response = await fetch(data.signedUrl);
      const encryptedData = await response.arrayBuffer();

      // Decrypt in browser
      const audioBlob = await decryptVoiceFile(encryptedData, voiceEncKey);
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      voiceAudioRef.current = audio;
      audio.onended = () => {
        setVoicePlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      audio.play();
      setVoicePlaying(true);
    } catch (err: any) {
      console.error("Voice playback error:", err);
      toast.error("Playback failed");
    }
  };

  // Auto-migrate unencrypted voice files to encrypted format
  useEffect(() => {
    if (!user || !loaded || !voicePath) return;
    if (voicePath.endsWith(".enc")) return; // Already encrypted
    const migrate = async () => {
      console.log("[VoiceMigration] Starting migration for path:", voicePath);
      try {
        const { data, error: signErr } = await supabase.storage.from("stimmen").createSignedUrl(voicePath, 120);
        if (signErr || !data?.signedUrl) {
          console.warn("[VoiceMigration] Signed URL failed:", signErr?.message ?? "no URL returned", "path:", voicePath);
          return;
        }
        console.log("[VoiceMigration] Signed URL obtained, downloading...");
        const resp = await fetch(data.signedUrl);
        if (!resp.ok) {
          console.warn("[VoiceMigration] Download failed:", resp.status, resp.statusText);
          return;
        }
        const wavBlob = await resp.blob();
        console.log("[VoiceMigration] Downloaded", wavBlob.size, "bytes, encrypting...");

        const keyB64 = await generateVoiceKey();
        const encBlob = await encryptVoiceFile(wavBlob, keyB64);
        const encPath = `${user.id}.enc`;

        const { error: upErr } = await supabase.storage
          .from("stimmen")
          .upload(encPath, encBlob, { upsert: true, contentType: "application/octet-stream" });
        if (upErr) {
          console.warn("[VoiceMigration] Upload failed:", upErr.message);
          return;
        }
        console.log("[VoiceMigration] Encrypted file uploaded to", encPath);

        const { error: dbErr } = await supabase
          .from("profiles")
          .update({ voice_path: encPath, voice_encryption_key: keyB64 } as any)
          .eq("id", user.id);
        if (dbErr) {
          console.warn("[VoiceMigration] DB update failed:", dbErr.message);
        }

        // Remove old unencrypted file
        const { error: delErr } = await supabase.storage.from("stimmen").remove([voicePath]);
        if (delErr) {
          console.warn("[VoiceMigration] Old file deletion failed:", delErr.message);
        }

        setVoicePath(encPath);
        setVoiceEncKey(keyB64);
        console.log("[VoiceMigration] ✅ Migration complete");
      } catch (err) {
        console.error("[VoiceMigration] ❌ Unexpected error:", err);
      }
    };
    migrate();
  }, [user, loaded, voicePath]);

  const initials =
    [firstName, lastName]
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background" {...swipeHandlers}>
      <header className="sticky top-0 z-10 bg-card/90 glass border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={goBack}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors active:scale-95"
            aria-label={t("a11y.back")}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex-1">{t("settings.profile") || "Profil"}</h1>
        </div>
      </header>

      <PaywallGate />
      <div className="flex-1 p-4 space-y-6 pb-28">
        {/* Avatar */}
        <section className="flex flex-col items-center animate-reveal-up">
          <div className="relative">
            <div className="w-28 h-28 rounded-3xl overflow-hidden shadow-elevated">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full gradient-primary flex items-center justify-center text-primary-foreground text-3xl font-bold">
                  {initials}
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-card border-2 border-border flex items-center justify-center shadow-soft hover:bg-secondary transition-colors active:scale-95"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <Camera className="w-4.5 h-4.5 text-muted-foreground" />
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </div>
          <p className="text-sm text-muted-foreground mt-3">{phoneNumber}</p>
        </section>

        {/* Subscription */}
        <section className="animate-reveal-up" style={{ animationDelay: "30ms" }}>
          <div className="bg-card rounded-2xl p-4 shadow-sm border border-border flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                isPremium ? "gradient-primary" : "bg-secondary",
              )}
            >
              <Crown className={cn("w-5 h-5", isPremium ? "text-primary-foreground" : "text-muted-foreground")} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-[0.938rem]">{planLabel}</p>
                {isFoundingUser && (
                  <Badge variant="default" className="text-[0.625rem]">
                    {t("profile.foundingUser")}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {isPremium
                  ? daysRemaining > 0 && !isFoundingUser && daysRemaining !== -1
                    ? t("profile.daysRemaining").replace("{n}", String(daysRemaining))
                    : t("profile.premiumActive")
                  : t("profile.upgradeHint")}
              </p>
            </div>
            {!isPremium && (
              <button
                onClick={() => requirePremium(() => {})}
                className="h-8 px-3 rounded-xl gradient-primary text-primary-foreground text-xs font-medium shadow-soft transition-all"
              >
                {t("profile.upgrade")}
              </button>
            )}
          </div>
        </section>

        {/* Name – auto-saves */}
        <section className="animate-reveal-up" style={{ animationDelay: "60ms" }}>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block px-1">
            {t("settings.displayName") || "Name"}
          </label>
          <div className="space-y-2.5">
            <input
              type="text"
              value={firstName}
              onChange={(e) => updateFirstName(e.target.value)}
              placeholder={locale === "de" ? "Vorname eingeben…" : "First name…"}
              className="w-full h-12 rounded-2xl bg-card px-4 text-base shadow-sm border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
            <input
              type="text"
              value={lastName}
              onChange={(e) => updateLastName(e.target.value)}
              placeholder={locale === "de" ? "Nachname (optional)" : "Last name (optional)"}
              className="w-full h-12 rounded-2xl bg-card px-4 text-base shadow-sm border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>
        </section>

        {/* Voice Profile */}
        <section className="animate-reveal-up" style={{ animationDelay: "90ms" }}>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block px-1">
            {locale === "de" ? "Meine Stimme" : "My Voice"}
          </label>
          <button
            onClick={() => navigate("/voice-recordings")}
            className="w-full bg-card rounded-2xl p-4 shadow-sm border border-border flex items-center gap-3 hover:bg-secondary/50 transition-colors active:scale-[0.98]"
          >
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                hasVoice ? "gradient-primary shadow-soft" : "bg-secondary",
              )}
            >
              <Mic className={cn("w-5 h-5", hasVoice ? "text-primary-foreground" : "text-muted-foreground")} />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-[0.938rem]">{locale === "de" ? "Stimmprofil" : "Voice Profile"}</p>
                {hasVoice && <CheckCircle className="w-4 h-4 text-accent" />}
              </div>
              <p className="text-xs text-muted-foreground">
                {hasVoice
                  ? locale === "de"
                    ? "Aktiv – Kontakte können dich hören"
                    : "Active – contacts can hear you"
                  : locale === "de"
                    ? "Einrichten, damit andere dich hören"
                    : "Set up so others can hear you"}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </section>

        {/* Voice File Upload */}
        <section className="animate-reveal-up" style={{ animationDelay: "105ms" }}>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block px-1">
            {t("profile.myVoiceFile")}
          </label>
          {voicePath ? (
            <div className="bg-card rounded-2xl p-4 shadow-sm border border-border space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-soft">
                  <Mic className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[0.938rem]">{voicePath}</p>
                  <p className="text-xs text-muted-foreground">{t("profile.voiceSaved")}</p>
                </div>
                <button
                  onClick={handlePlayVoice}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
                >
                  {voicePlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleDeleteVoiceFile}
                className="w-full h-9 rounded-xl text-destructive/70 text-xs font-medium hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                {t("profile.deleteVoiceFile")}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Record button */}
              <button
                onClick={handleToggleRecording}
                disabled={voiceUploading}
                className={cn(
                  "w-full bg-card rounded-2xl p-4 shadow-sm border border-border flex items-center gap-3 transition-colors active:scale-[0.98]",
                  isRecording ? "border-destructive/50 bg-destructive/5" : "hover:bg-secondary/50",
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  isRecording ? "bg-destructive/20" : "bg-secondary",
                )}>
                  {isRecording ? (
                    <Square className="w-5 h-5 text-destructive" />
                  ) : voiceUploading ? (
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  ) : (
                    <Mic className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-[0.938rem]">
                    {isRecording
                      ? locale === "de" ? "Stoppen" : "Stop"
                      : locale === "de" ? "Aufnahme starten" : "Start Recording"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isRecording
                      ? locale === "de" ? "Aufnahme läuft…" : "Recording…"
                      : locale === "de" ? "Direkt aufnehmen" : "Record directly"}
                  </p>
                </div>
              </button>
            </div>
          )}
        </section>

        <section className="animate-reveal-up space-y-3 pt-2" style={{ animationDelay: "120ms" }}>
          <button
            onClick={handleSignOut}
            className="w-full h-12 rounded-2xl bg-destructive/10 text-destructive font-semibold text-sm flex items-center justify-center gap-2 hover:bg-destructive/20 transition-colors active:scale-[0.97]"
          >
            <LogOut className="w-4 h-4" />
            {t("settings.signOut") || "Abmelden"}
          </button>
          <button
            onClick={async () => {
              if (!window.confirm(t("profile.deleteAccountConfirm"))) return;
              if (!user) return;
              try {
                const { error } = await supabase.functions.invoke("delete-account");
                if (error) throw error;
                await signOut();
                navigate("/login");
                toast.success(t("profile.accountDeleted"));
              } catch {
                toast.error(t("profile.deleteAccountError"));
              }
            }}
            className="w-full h-10 rounded-xl text-destructive/50 text-xs font-medium hover:text-destructive transition-colors active:scale-[0.97]"
          >
            {t("profile.deleteAccount")}
          </button>
        </section>
      </div>
    </div>
  );
};

export default ProfilePage;
