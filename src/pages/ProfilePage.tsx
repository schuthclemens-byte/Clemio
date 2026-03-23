import { useState, useEffect, useRef } from "react";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Check, LogOut, Crown, Trash2, ShieldCheck } from "lucide-react";
import { useI18n, localeNames, type Locale } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import VoiceCloneUpload from "@/components/voice/VoiceCloneUpload";
import VoiceConsentManager from "@/components/voice/VoiceConsentManager";
import PremiumBadge from "@/components/PremiumBadge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { usePremiumGate } from "@/hooks/usePremiumGate";
import { Badge } from "@/components/ui/badge";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { locale, setLocale, t } = useI18n();
  const { user, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [voiceProfile, setVoiceProfile] = useState<{ voice_name: string; elevenlabs_voice_id: string } | null>(null);
  const { isPremium, isFoundingUser, planLabel, daysRemaining } = useSubscription();
  const { requirePremium, PaywallGate } = usePremiumGate();

  const loadVoiceProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("voice_profiles" as any)
      .select("voice_name, elevenlabs_voice_id")
      .eq("user_id", user.id)
      .maybeSingle();
    setVoiceProfile(data as any);
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, phone_number, avatar_url, language")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setDisplayName(data.display_name || "");
        setPhoneNumber(data.phone_number || "");
        setAvatarUrl(data.avatar_url);
        if (data.language) setLocale(data.language as Locale);
      }
      setLoaded(true);
    };
    load();
    loadVoiceProfile();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      toast.error(t("profile.uploadFailed"));
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await supabase.from("profiles").update({ avatar_url: newUrl }).eq("id", user.id);
    setAvatarUrl(newUrl);
    setUploading(false);
    toast.success(t("profile.avatarUpdated"));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || "Nutzer",
        language: locale,
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      toast.error(t("profile.saveFailed"));
    } else {
      toast.success(t("profile.saved"));
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleDeleteVoice = async () => {
    if (!user || !voiceProfile) return;
    const confirmed = window.confirm(t("profile.deleteVoiceConfirm"));
    if (!confirmed) return;

    await supabase
      .from("voice_profiles" as any)
      .delete()
      .eq("user_id", user.id);

    // Also revoke all consents
    await supabase
      .from("voice_consents" as any)
      .delete()
      .eq("voice_owner_id", user.id);

    setVoiceProfile(null);
    toast.success(t("profile.voiceDeleted"));
  };

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  const languages = Object.entries(localeNames) as [Locale, string][];

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background" {...useSwipeBack({ fallbackPath: "/chats" })}>
      <header className="sticky top-0 z-10 bg-card/90 glass border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors active:scale-95"
              aria-label={t("a11y.back")}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold">{t("settings.profile") || "Profil"}</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-4 rounded-xl gradient-primary text-primary-foreground text-sm font-medium shadow-soft hover:shadow-elevated transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                {t("settings.save") || "Speichern"}
              </>
            )}
          </button>
        </div>
      </header>

      <PaywallGate />
      <div className="flex-1 p-4 space-y-6">
        {/* Subscription Status */}
        <section className="animate-reveal-up">
          <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            {t("profile.subStatus")}
          </label>
          <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                isPremium ? "gradient-primary" : "bg-secondary"
              )}>
                <Crown className={cn("w-6 h-6", isPremium ? "text-primary-foreground" : "text-muted-foreground")} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[0.938rem]">{planLabel}</p>
                  {isFoundingUser && (
                    <Badge variant="default" className="text-[0.625rem]">{t("profile.foundingUser")}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isPremium
                    ? daysRemaining > 0
                      ? `Noch ${daysRemaining} Tage Premium`
                      : "Premium aktiv"
                    : "Upgrade für alle Funktionen"
                  }
                </p>
              </div>
              {!isPremium && (
                <button
                  onClick={() => requirePremium(() => {})}
                  className="h-9 px-4 rounded-xl gradient-primary text-primary-foreground text-sm font-medium shadow-soft hover:shadow-elevated transition-all"
                >
                  Upgrade
                </button>
              )}
            </div>
            {isFoundingUser && isPremium && (
              <p className="text-xs text-muted-foreground mt-3 bg-primary/5 rounded-xl p-3">
                🎉 Du bist einer der ersten 50 Nutzer. Du erhältst 60 Tage Premium kostenlos.
              </p>
            )}
          </div>
        </section>
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <p className="text-sm text-muted-foreground mt-3">{phoneNumber}</p>
        </section>

        {/* Name */}
        <section className="animate-reveal-up" style={{ animationDelay: "60ms" }}>
          <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            {t("settings.displayName") || "Anzeigename"}
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Dein Name"
            className="w-full h-14 rounded-2xl bg-card px-5 text-base shadow-sm border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
          />
        </section>

        {/* Language */}
        <section className="animate-reveal-up" style={{ animationDelay: "120ms" }}>
          <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            {t("settings.language")}
          </label>
          <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
            {languages.map(([code, name]) => (
              <button
                key={code}
                onClick={() => setLocale(code)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors",
                  "hover:bg-secondary/50 active:scale-[0.99]",
                  "border-b border-border last:border-b-0",
                  locale === code && "bg-primary/5"
                )}
              >
                <span className="text-[0.938rem]">{name}</span>
                {locale === code && (
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Voice Cloning */}
        <section className="animate-reveal-up" style={{ animationDelay: "180ms" }}>
          <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
            Stimme
            {!isPremium && <PremiumBadge />}
          </label>
          <VoiceCloneUpload existingVoice={voiceProfile} onCloned={loadVoiceProfile} />
          {voiceProfile && (
            <button
              onClick={handleDeleteVoice}
              className="w-full mt-3 flex items-center justify-center gap-2 h-11 rounded-xl bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors active:scale-[0.97]"
            >
              <Trash2 className="w-4 h-4" />
              Stimme löschen
            </button>
          )}
          <div className="mt-3 p-4 rounded-2xl bg-accent/5 border border-accent/10 space-y-2">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Deine Stimme ist geschützt</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  Deine Stimme wird <strong>nur mit deiner ausdrücklichen Zustimmung</strong> für andere hörbar. 
                  Du kannst Freigaben jederzeit widerrufen und dein Stimmmodell komplett löschen.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/privacy")}
              className="text-xs text-primary font-medium hover:underline ml-7"
            >
              Mehr zum Datenschutz →
            </button>
          </div>
        </section>

        {/* Voice Consent */}
        <section className="animate-reveal-up" style={{ animationDelay: "240ms" }}>
          <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
            Stimmfreigaben
            {!isPremium && <PremiumBadge />}
          </label>
          <VoiceConsentManager />
        </section>

        {/* Sign Out */}
        <section className="animate-reveal-up space-y-3" style={{ animationDelay: "300ms" }}>
          <button
            onClick={handleSignOut}
            className="w-full h-14 rounded-2xl bg-destructive/10 text-destructive font-semibold text-base flex items-center justify-center gap-2 hover:bg-destructive/20 transition-colors active:scale-[0.97]"
          >
            <LogOut className="w-5 h-5" />
            {t("settings.signOut") || "Abmelden"}
          </button>

          <button
            onClick={async () => {
              if (!window.confirm("Bist du sicher? Dein Konto und alle Daten werden unwiderruflich gelöscht.")) return;
              if (!user) return;
              try {
                // Delete all user data
                await supabase.from("voice_profiles" as any).delete().eq("user_id", user.id);
                await supabase.from("voice_consents" as any).delete().eq("voice_owner_id", user.id);
                await supabase.from("subscriptions" as any).delete().eq("user_id", user.id);
                await supabase.from("profiles").delete().eq("id", user.id);
                await signOut();
                navigate("/login");
                toast.success("Dein Konto wurde gelöscht");
              } catch {
                toast.error("Fehler beim Löschen des Kontos");
              }
            }}
            className="w-full h-11 rounded-xl text-destructive/60 text-sm font-medium hover:text-destructive transition-colors active:scale-[0.97]"
          >
            Konto dauerhaft löschen
          </button>
        </section>
      </div>
    </div>
  );
};

export default ProfilePage;
