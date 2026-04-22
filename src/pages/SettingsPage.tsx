import { useState, useEffect, useRef, useCallback } from "react";
import { useSmartBack } from "@/hooks/useSmartBack";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Eye, Volume2, Headphones, BellOff, Download, VolumeX, FileText,
  Lock, LogOut, KeyRound, CreditCard, Crown, ExternalLink, Loader2, RefreshCw,
  Radio, MessageSquareText, Bell, CheckCircle2, XCircle, Smartphone, Info,
  Globe, Type, Contrast, SpellCheck, AlignLeft, Shield, ChevronRight, Settings2, ChevronDown, Ban, Palette,
} from "lucide-react";
import { useI18n, localeNames, type Locale } from "@/contexts/I18nContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PremiumBadge from "@/components/PremiumBadge";
import { useSubscription } from "@/hooks/useSubscription";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { usePushCapability } from "@/hooks/usePushCapability";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAdminRole } from "@/hooks/useAdminRole";

/** Reusable toggle row */
const ToggleRow = ({
  icon: Icon, label, description, checked, onChange, disabled, borderBottom = true,
}: {
  icon?: React.ElementType; label: string; description?: string;
  checked: boolean; onChange: () => void; disabled?: boolean; borderBottom?: boolean;
}) => (
  <button
    onClick={onChange}
    disabled={disabled}
    className={cn(
      "w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors",
      "hover:bg-secondary/50 active:scale-[0.99] disabled:opacity-60",
      borderBottom && "border-b border-border last:border-b-0"
    )}
    role="switch"
    aria-checked={checked}
  >
    <span className="flex items-start gap-3 flex-1 min-w-0">
      {Icon && <Icon className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <span className="text-[0.938rem] block font-medium">{label}</span>
        {description && <span className="text-xs text-muted-foreground leading-relaxed">{description}</span>}
      </div>
    </span>
    <div className={cn(
      "w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0 ml-3",
      checked ? "bg-primary" : "bg-border"
    )}>
      <div className={cn(
        "absolute top-0.5 w-5 h-5 rounded-full bg-card shadow-sm transition-transform duration-200",
        checked ? "translate-x-[1.375rem]" : "translate-x-0.5"
      )} />
    </div>
  </button>
);

/** Link row */
const LinkRow = ({
  icon: Icon, label, description, onClick, borderBottom = true, badge,
}: {
  icon: React.ElementType; label: string; description?: string;
  onClick: () => void; borderBottom?: boolean; badge?: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors",
      "hover:bg-secondary/50 active:scale-[0.99]",
      borderBottom && "border-b border-border last:border-b-0"
    )}
  >
    <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
    <div className="flex-1 min-w-0">
      <span className="text-[0.938rem] block font-medium flex items-center gap-2">
        {label}
        {badge}
      </span>
      {description && <span className="text-xs text-muted-foreground leading-relaxed">{description}</span>}
    </div>
    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
  </button>
);

/** Accordion section header */
const AccordionHeader = ({
  icon: Icon, label, isOpen, onToggle,
}: {
  icon: React.ElementType; label: string; isOpen: boolean; onToggle: () => void;
}) => (
  <button
    onClick={onToggle}
    className="w-full flex items-center justify-between px-1 py-3 group"
  >
    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
      <Icon className="w-3.5 h-3.5" />
      {label}
    </h2>
    <ChevronDown className={cn(
      "w-4 h-4 text-muted-foreground transition-transform duration-300",
      isOpen && "rotate-180"
    )} />
  </button>
);

/** Animated collapsible body */
const AccordionBody = ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  // Re-measure when content changes
  useEffect(() => {
    if (isOpen && contentRef.current) {
      const observer = new ResizeObserver(() => {
        if (contentRef.current) setHeight(contentRef.current.scrollHeight);
      });
      observer.observe(contentRef.current);
      return () => observer.disconnect();
    }
  }, [isOpen]);

  return (
    <div
      className="overflow-hidden transition-all duration-300 ease-out"
      style={{ height: `${height}px`, opacity: isOpen ? 1 : 0 }}
    >
      <div ref={contentRef}>
        {children}
      </div>
    </div>
  );
};

const savedToast = () => toast("Gespeichert ✓", { duration: 2000 });

type SectionKey = "communication" | "playback" | "display" | "account" | "legal";

const SettingsPage = () => {
  const { goBack, swipeHandlers } = useSmartBack("/chats");
  const navigate = useNavigate();
  const { locale, setLocale, t } = useI18n();
  const a11y = useAccessibility();
  const { user, signOut } = useAuth();
  const { isPremium, planLabel, daysRemaining, isFoundingUser, stripeActive, startCheckout, openPortal, checkoutLoading, portalLoading, refreshSubscription } = useSubscription();
  const pushCap = usePushCapability();
  const { status: pushStatus, subscribe: pushSubscribe } = usePushSubscription();
  const { isAdmin } = useAdminRole();

  const [openSection, setOpenSection] = useState<SectionKey | null>(null);
  const [stayLoggedIn, setStayLoggedIn] = useState(() => localStorage.getItem("clemio_stay_logged_in") !== "false");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [refreshingSubscription, setRefreshingSubscription] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [defaultVoice, setDefaultVoice] = useState(() => localStorage.getItem("clemio_default_voice") || "onwK4e9ZLuTAKqWW03F9");
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const languages = Object.entries(localeNames) as [Locale, string][];
  const tr = (de: string, en: string) => (locale === "de" ? de : en);

  const toggleSection = (key: SectionKey) => {
    setOpenSection(prev => prev === key ? null : key);
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("push_preview_enabled").eq("id", user.id).single().then(({ data }) => {
      if (data) setPreviewEnabled(!!data.push_preview_enabled);
    });
  }, [user]);

  const togglePreview = async () => {
    if (!user) return;
    const next = !previewEnabled;
    const { error } = await supabase.from("profiles").update({ push_preview_enabled: next } as any).eq("id", user.id);
    if (!error) { setPreviewEnabled(next); savedToast(); }
  };

  const handleLogout = async () => { await signOut(); navigate("/login", { replace: true }); };

  const toggleStayLoggedIn = () => {
    const next = !stayLoggedIn;
    setStayLoggedIn(next);
    localStorage.setItem("clemio_stay_logged_in", next ? "true" : "false");
    savedToast();
  };

  const handleRefreshSubscription = async () => {
    setRefreshingSubscription(true);
    const result = await refreshSubscription();
    if (!result?.ok) { toast.error(result?.error ?? t("settings.subNotFound")); setRefreshingSubscription(false); return; }
    toast.success(result.subscribed ? t("settings.subRecognized") : t("settings.subNotFound"));
    setLastChecked(new Date());
    setRefreshingSubscription(false);
  };

  const previewVoice = useCallback(async (voiceId: string, name: string) => {
    if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null; }
    if (previewingVoice === voiceId) { setPreviewingVoice(null); return; }
    setPreviewingVoice(voiceId);
    try {
      const sampleText = locale === "de"
        ? `Hallo, ich bin ${name}. So klingt meine Stimme in Clemio.`
        : `Hi, I'm ${name}. This is how my voice sounds in Clemio.`;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-tts`,
        { method: "POST", headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` }, body: JSON.stringify({ text: sampleText, defaultVoiceId: voiceId }) }
      );
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.onended = () => { setPreviewingVoice(null); previewAudioRef.current = null; };
      audio.onerror = () => { setPreviewingVoice(null); previewAudioRef.current = null; };
      await audio.play();
    } catch {
      toast.error(locale === "de" ? "Vorschau fehlgeschlagen" : "Preview failed");
      setPreviewingVoice(null);
    }
  }, [previewingVoice, locale]);

  return (
    <div className="flex flex-col min-h-screen bg-background" {...swipeHandlers}>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/90 glass border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={goBack} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors active:scale-95" aria-label={t("a11y.back")}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex-1">{t("settings.title")}</h1>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-2 pb-28">

        {/* ━━━ ADMIN ━━━ */}
        {isAdmin && (
          <section>
            <LinkRow icon={Shield} label="Administration" onClick={() => navigate("/admin")} />
          </section>
        )}

        {/* ━━━ KOMMUNIKATION ━━━ */}
        <section>
          <AccordionHeader icon={MessageSquareText} label={tr("Kommunikation", "Communication")} isOpen={openSection === "communication"} onToggle={() => toggleSection("communication")} />
          <AccordionBody isOpen={openSection === "communication"}>
            <div className="space-y-2 pb-4">
              <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
                <ToggleRow icon={Eye} label={t("settings.readReceipts")} description={t("settings.readReceiptsDesc")}
                  checked={localStorage.getItem("clemio_read_receipts") !== "false"}
                  onChange={() => {
                    const next = localStorage.getItem("clemio_read_receipts") === "false";
                    localStorage.setItem("clemio_read_receipts", next ? "true" : "false");
                    toast.success(next ? t("settings.readReceiptsOn") : t("settings.readReceiptsOff"));
                  }}
                />
                <ToggleRow icon={Radio} label={t("settings.onlineStatus")} description={t("settings.onlineStatusDesc")}
                  checked={a11y.showOnlineStatus} onChange={() => { a11y.toggle("showOnlineStatus"); savedToast(); }}
                />
                <ToggleRow icon={Type} label={t("settings.typingIndicator")} description={t("settings.typingIndicatorDesc")}
                  checked={a11y.showTypingIndicator} onChange={() => { a11y.toggle("showTypingIndicator"); savedToast(); }}
                />
                <ToggleRow icon={MessageSquareText} label={t("settings.messagePreview")} description={t("settings.messagePreviewDesc")}
                  checked={previewEnabled} onChange={togglePreview} borderBottom={false}
                />
              </div>

              {/* Push – simple toggle */}
              <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
                <ToggleRow icon={Bell} label={t("settings.pushTitle")} description={t("settings.pushDesc")}
                  checked={pushStatus.savedToBackend}
                  onChange={async () => {
                    if (pushStatus.savedToBackend) {
                      toast.info(t("settings.pushDisableHint"));
                      return;
                    }
                    if (!pushCap.canUsePush) {
                      toast.error(pushCap.reason || t("settings.pushNotSupported"));
                      return;
                    }
                    const ok = await pushSubscribe();
                    ok ? toast.success(t("settings.pushActivated")) : toast.error(t("settings.pushFailed"));
                  }}
                  borderBottom={false}
                />
              </div>
            </div>
          </AccordionBody>
        </section>

        {/* ━━━ WIEDERGABE ━━━ */}
        <section>
          <AccordionHeader icon={Volume2} label={tr("Wiedergabe", "Playback")} isOpen={openSection === "playback"} onToggle={() => toggleSection("playback")} />
          <AccordionBody isOpen={openSection === "playback"}>
            <div className="space-y-2 pb-4">
              <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
                <ToggleRow icon={Volume2} label={t("settings.autoReadMessages")} description={t("settings.autoReadMessagesDesc")}
                  checked={a11y.autoRead} onChange={() => { a11y.toggle("autoRead"); savedToast(); }}
                />
                <ToggleRow icon={Headphones} label={t("settings.headphoneAutoPlay")}
                  checked={a11y.headphoneAutoPlay} onChange={() => { a11y.toggle("headphoneAutoPlay"); savedToast(); }}
                />
                <ToggleRow icon={VolumeX} label={t("settings.muteSounds")} description={t("settings.muteSoundsDesc")}
                  checked={a11y.muteSounds} onChange={() => { a11y.toggle("muteSounds"); savedToast(); }} borderBottom={false}
                />
              </div>

              {/* Focus & AutoPlay links */}
              <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
                <LinkRow icon={Shield} label={t("settings.focusMode")} description={t("settings.focusModeDesc")} onClick={() => navigate("/focus-mode")} />
                <LinkRow icon={Volume2} label={t("settings.autoPlayContact")} description={t("settings.autoPlayContactDesc")} onClick={() => navigate("/contact-autoplay")}
                  badge={!isPremium ? <PremiumBadge /> : undefined} borderBottom={false}
                />
              </div>

              {/* Speech rate */}
              <div className="bg-card rounded-2xl shadow-sm overflow-hidden px-4 py-3.5">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="flex items-center gap-3">
                    <Volume2 className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[0.938rem] font-medium">{t("settings.speechRate")}</span>
                  </span>
                  <span className="text-sm font-semibold text-primary">{a11y.speechRate}×</span>
                </div>
                <div className="flex gap-2">
                  {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button key={rate} onClick={() => { a11y.setSpeechRate(rate); savedToast(); }}
                      className={cn("flex-1 h-9 rounded-xl text-sm font-medium transition-all active:scale-95",
                        a11y.speechRate === rate ? "gradient-primary text-primary-foreground shadow-soft" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      )}
                    >{rate}×</button>
                  ))}
                </div>
              </div>

              {/* Default voice */}
              <div className="bg-card rounded-2xl shadow-sm overflow-hidden px-4 py-3.5">
                <div className="flex items-center gap-3 mb-2.5">
                  <Volume2 className="w-5 h-5 text-muted-foreground" />
                  <span className="text-[0.938rem] font-medium">{tr("Standard-Stimme", "Default Voice")}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", gender: "♂" },
                    { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", gender: "♂" },
                    { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", gender: "♀" },
                    { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", gender: "♀" },
                  ].map((voice) => (
                    <div key={voice.id} className="flex items-center gap-1.5">
                      <button onClick={() => { localStorage.setItem("clemio_default_voice", voice.id); setDefaultVoice(voice.id); savedToast(); }}
                        className={cn("flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95",
                          defaultVoice === voice.id ? "gradient-primary text-primary-foreground shadow-soft" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                        )}
                      >
                        <span>{voice.gender}</span><span>{voice.name}</span>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); previewVoice(voice.id, voice.name); }}
                        className={cn("shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90",
                          previewingVoice === voice.id ? "bg-primary text-primary-foreground animate-pulse" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                        )}
                      >
                        {previewingVoice === voice.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Smart silence */}
              <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
                <ToggleRow icon={BellOff} label={t("settings.smartSilence")} description={t("settings.smartSilenceDesc")}
                  checked={a11y.smartSilence} onChange={() => { a11y.toggle("smartSilence"); savedToast(); }} borderBottom={false}
                />
                {a11y.smartSilence && (
                  <div className="px-4 pb-3.5 flex gap-3 items-center">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground block mb-1">{t("settings.quietFrom")}</label>
                      <input type="time" value={a11y.quietHoursStart} onChange={(e) => a11y.setQuietHours(e.target.value, a11y.quietHoursEnd)}
                        className="w-full h-9 rounded-xl bg-secondary px-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground block mb-1">{t("settings.quietTo")}</label>
                      <input type="time" value={a11y.quietHoursEnd} onChange={(e) => a11y.setQuietHours(a11y.quietHoursStart, e.target.value)}
                        className="w-full h-9 rounded-xl bg-secondary px-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </AccordionBody>
        </section>

        {/* ━━━ ANZEIGE ━━━ */}
        <section>
          <AccordionHeader icon={Globe} label={tr("Anzeige", "Display")} isOpen={openSection === "display"} onToggle={() => toggleSection("display")} />
          <AccordionBody isOpen={openSection === "display"}>
            <div className="space-y-2 pb-4">
              {/* Language – compact select */}
              <div className="bg-card rounded-2xl shadow-sm overflow-hidden px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[0.938rem] font-medium">{t("settings.language")}</span>
                  </span>
                  <select
                    value={locale}
                    onChange={(e) => { setLocale(e.target.value as Locale); savedToast(); }}
                    className="h-9 px-3 rounded-xl bg-secondary text-sm font-medium border-none focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer pr-8"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.75rem center" }}
                  >
                    {languages.map(([code, name]) => (
                      <option key={code} value={code}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Accessibility toggles */}
              <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
                <ToggleRow icon={Type} label={t("settings.dyslexiaFont")} checked={a11y.dyslexiaFont} onChange={() => { a11y.toggle("dyslexiaFont"); savedToast(); }} />
                <ToggleRow icon={Eye} label={t("settings.largeText")} checked={a11y.largeText} onChange={() => { a11y.toggle("largeText"); savedToast(); }} />
                <ToggleRow icon={Contrast} label={t("settings.highContrast")} checked={a11y.highContrast} onChange={() => { a11y.toggle("highContrast"); savedToast(); }} />
                <ToggleRow icon={SpellCheck} label={t("settings.autoCorrect")} checked={a11y.autoCorrect} onChange={() => { a11y.toggle("autoCorrect"); savedToast(); }} />
                <ToggleRow icon={AlignLeft} label={t("settings.compactMode")} description={t("settings.compactModeDesc")}
                  checked={a11y.compactMode} onChange={() => { a11y.toggle("compactMode"); savedToast(); }} borderBottom={false}
                />
              </div>
            </div>
          </AccordionBody>
        </section>

        {/* ━━━ KONTO ━━━ */}
        <section>
          <AccordionHeader icon={Settings2} label={tr("Konto", "Account")} isOpen={openSection === "account"} onToggle={() => toggleSection("account")} />
          <AccordionBody isOpen={openSection === "account"}>
            <div className="space-y-2 pb-4">
              <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
                <ToggleRow icon={KeyRound} label={t("settings.stayLoggedIn")} description={t("settings.stayLoggedInDesc")}
                  checked={stayLoggedIn} onChange={toggleStayLoggedIn} borderBottom={true}
                />
                {!window.matchMedia("(display-mode: standalone)").matches && !(window.navigator as any).standalone && !(window as any).Capacitor?.isNativePlatform?.() && (
                  <LinkRow icon={Download} label={t("settings.installApp")} description={t("settings.installAppDesc")} onClick={() => navigate("/install")} borderBottom={true} />
                )}
                <LinkRow icon={Ban} label={t("settings.blockedUsers")} onClick={() => navigate("/blocked-users")} borderBottom={false} />
              </div>

              {/* Subscription */}
              {!(isFoundingUser && daysRemaining === -1) && (
                <div className="bg-card rounded-2xl shadow-sm overflow-hidden px-4 py-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", isPremium ? "gradient-primary" : "bg-muted")}>
                        <Crown className={cn("w-4 h-4", isPremium ? "text-primary-foreground" : "text-muted-foreground")} />
                      </div>
                      <div>
                        <p className="font-semibold text-[0.938rem]">{planLabel}</p>
                        {isPremium && daysRemaining > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {stripeActive ? t("sub.nextPayment").replace("{n}", String(daysRemaining)) : t("sub.daysLeft").replace("{n}", String(daysRemaining))}
                          </p>
                        )}
                      </div>
                    </div>
                    <button onClick={handleRefreshSubscription} disabled={refreshingSubscription}
                      className="p-2 rounded-full hover:bg-secondary transition-colors disabled:opacity-60"
                    >
                      <RefreshCw className={cn("w-4 h-4 text-muted-foreground", refreshingSubscription && "animate-spin")} />
                    </button>
                  </div>
                  {!isPremium && (
                    <button onClick={startCheckout} disabled={checkoutLoading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 mt-3 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-60"
                    >
                      {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                      {t("sub.subscribe")}
                    </button>
                  )}
                  {stripeActive && (
                    <button onClick={openPortal} disabled={portalLoading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 mt-2 rounded-xl bg-secondary text-foreground font-medium text-sm transition-all active:scale-[0.97] disabled:opacity-60"
                    >
                      {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                      {t("sub.manage")}
                    </button>
                  )}
                </div>
              )}

              {/* Logout */}
              {!showLogoutConfirm ? (
                <button onClick={() => setShowLogoutConfirm(true)}
                  className="w-full flex items-center justify-center gap-3 p-3.5 bg-destructive/10 text-destructive rounded-2xl shadow-sm hover:bg-destructive/20 transition-colors active:scale-[0.98] font-semibold text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  {t("settings.logout")}
                </button>
              ) : (
                <div className="bg-card rounded-2xl shadow-sm p-4 space-y-3 border border-destructive/20">
                  <p className="text-sm text-center text-muted-foreground">{t("settings.logoutConfirm")}</p>
                  <div className="flex gap-3">
                    <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground font-medium text-sm">{t("a11y.back")}</button>
                    <button onClick={handleLogout} className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-medium text-sm">{t("settings.logout")}</button>
                  </div>
                </div>
              )}
            </div>
          </AccordionBody>
        </section>

        {/* ━━━ RECHTLICHES ━━━ */}
        <section>
          <AccordionHeader icon={Lock} label={t("settings.legal")} isOpen={openSection === "legal"} onToggle={() => toggleSection("legal")} />
          <AccordionBody isOpen={openSection === "legal"}>
            <div className="pb-4">
              <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
                <LinkRow icon={Shield} label={t("settings.privacy")} onClick={() => navigate("/privacy")} />
                <LinkRow icon={FileText} label={t("settings.terms")} onClick={() => navigate("/terms")} borderBottom={false} />
              </div>
            </div>
          </AccordionBody>
        </section>

      </div>
    </div>
  );
};

export default SettingsPage;
