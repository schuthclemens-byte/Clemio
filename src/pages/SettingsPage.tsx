import { useState, useEffect } from "react";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Globe, Eye, Type, Contrast, Volume2, Moon, Sun, Monitor, User, Headphones, Shield, BellOff, AlignLeft, Download, VolumeX, FileText, Lock, Palette, ImageIcon, ChevronDown, SpellCheck, LogOut, KeyRound, CreditCard, Crown, ExternalLink, Loader2, RefreshCw, Radio, MessageSquareText } from "lucide-react";
import { useI18n, localeNames, type Locale } from "@/contexts/I18nContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useColorTheme, colorThemeLabels, colorThemePreview, type ColorTheme } from "@/contexts/ColorThemeContext";
import { useChatBackground } from "@/contexts/ChatBackgroundContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import BackgroundPicker from "@/components/chat/BackgroundPicker";
import PremiumBadge from "@/components/PremiumBadge";
import { useSubscription } from "@/hooks/useSubscription";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CollapsibleSection = ({ 
  icon: Icon, 
  title, 
  children, 
  defaultOpen = false,
  delay = "0ms"
}: { 
  icon: React.ElementType; 
  title: string; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
  delay?: string;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="animate-reveal-up" style={{ animationDelay: delay }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between mb-3"
      >
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {title}
        </h2>
        <ChevronDown className={cn(
          "w-4 h-4 text-muted-foreground transition-transform duration-200",
          open && "rotate-180"
        )} />
      </button>
      <div className={cn(
        "overflow-hidden transition-all duration-300",
        open ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
      )}>
        {children}
      </div>
    </section>
  );
};

/** Reusable toggle row */
const ToggleRow = ({ 
  icon: Icon, 
  label, 
  description, 
  checked, 
  onChange, 
  disabled,
  borderBottom = true 
}: { 
  icon?: React.ElementType; 
  label: string; 
  description?: string; 
  checked: boolean; 
  onChange: () => void; 
  disabled?: boolean;
  borderBottom?: boolean;
}) => (
  <button
    onClick={onChange}
    disabled={disabled}
    className={cn(
      "w-full flex items-center justify-between px-4 py-4 text-left transition-colors",
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


const SettingsPage = () => {
  const navigate = useNavigate();
  const { locale, setLocale, t } = useI18n();
  const a11y = useAccessibility();
  const { theme, setTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();
  const { globalBackground, setGlobalBackground } = useChatBackground();
  const { user } = useAuth();
  const { signOut } = useAuth();
  const { isPremium, planLabel, daysRemaining, isFoundingUser, stripeActive, startCheckout, openPortal, checkoutLoading, portalLoading, refreshSubscription } = useSubscription();
  const [bgPickerOpen, setBgPickerOpen] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(() => localStorage.getItem("clemio_stay_logged_in") !== "false");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [refreshingSubscription, setRefreshingSubscription] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Load push preview from profile
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
    if (!error) setPreviewEnabled(next);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const toggleStayLoggedIn = () => {
    const next = !stayLoggedIn;
    setStayLoggedIn(next);
    localStorage.setItem("clemio_stay_logged_in", next ? "true" : "false");
  };

  const handleRefreshSubscription = async () => {
    setRefreshingSubscription(true);
    const result = await refreshSubscription();

    if (!result?.ok) {
      toast.error(result?.error ?? "Premium-Status konnte nicht geprüft werden");
      setRefreshingSubscription(false);
      return;
    }

    toast.success(
      result.subscribed
        ? "Premium-Abo wurde erkannt"
        : "Kein aktives Premium-Abo gefunden"
    );
    setLastChecked(new Date());
    setRefreshingSubscription(false);
  };

  const languages = Object.entries(localeNames) as [Locale, string][];
  const colorThemes = Object.keys(colorThemeLabels) as ColorTheme[];

  const themeOptions = [
    { value: "system" as const, icon: Monitor, label: t("settings.themeSystem") },
    { value: "light" as const, icon: Sun, label: t("settings.themeLight") },
    { value: "dark" as const, icon: Moon, label: t("settings.themeDark") },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background" {...useSwipeBack({ fallbackPath: "/chats" })}>
      <header className="sticky top-0 z-10 bg-card/90 glass border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors active:scale-95"
            aria-label={t("a11y.back")}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{t("settings.title")}</h1>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-6">
        {/* Profile link */}
        <button
          onClick={() => navigate("/profile")}
          className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl shadow-sm hover:bg-secondary/50 transition-colors active:scale-[0.98] animate-reveal-up"
        >
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground">
            <User className="w-6 h-6" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-[0.938rem]">{t("settings.profile")}</p>
            <p className="text-xs text-muted-foreground">{t("settings.profileDesc")}</p>
          </div>
        </button>

        {/* ──────────── PRIVATSPHÄRE & NACHRICHTEN ──────────── */}
        <CollapsibleSection icon={Shield} title="Privatsphäre & Nachrichten" defaultOpen={true} delay="30ms">
          <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
            <ToggleRow
              icon={MessageSquareText}
              label="Nachrichtenvorschau anzeigen"
              description="Zeigt eine kurze Vorschau der Nachricht in Push-Benachrichtigungen."
              checked={previewEnabled}
              onChange={togglePreview}
            />
            <ToggleRow
              icon={Eye}
              label="Lesebestätigungen senden"
              description="Andere sehen, wenn du ihre Nachricht gelesen hast."
              checked={localStorage.getItem("clemio_read_receipts") !== "false"}
              onChange={() => {
                const next = localStorage.getItem("clemio_read_receipts") === "false";
                localStorage.setItem("clemio_read_receipts", next ? "true" : "false");
                toast.success(next ? "Lesebestätigungen aktiviert" : "Lesebestätigungen deaktiviert");
              }}
            />
            <ToggleRow
              icon={Radio}
              label="Online-Status anzeigen"
              description="Anderen zeigen, dass du online bist, und Status von Kontakten sehen."
              checked={a11y.showOnlineStatus}
              onChange={() => a11y.toggle("showOnlineStatus")}
            />
            <ToggleRow
              icon={Type}
              label="Tipp-Anzeige"
              description="Zeigen wenn jemand tippt und anderen zeigen wenn du tippst."
              checked={a11y.showTypingIndicator}
              onChange={() => a11y.toggle("showTypingIndicator")}
            />
            <ToggleRow
              icon={Volume2}
              label="Sprachnachrichten automatisch transkribieren"
              description="Sprachnachrichten werden als Text unter der Nachricht angezeigt."
              checked={a11y.autoRead}
              onChange={() => a11y.toggle("autoRead")}
              borderBottom={false}
            />
          </div>

        </CollapsibleSection>


        {/* ──────────── ERSCHEINUNGSBILD ──────────── */}
        <CollapsibleSection icon={Palette} title="Erscheinungsbild" delay="60ms">
          <div className="space-y-4">
            {/* Theme */}
            <div className="bg-card rounded-2xl shadow-sm overflow-hidden flex">
              {themeOptions.map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-2 py-4 transition-all duration-200",
                    "hover:bg-secondary/50 active:scale-[0.97]",
                    theme === value && "bg-primary/10"
                  )}
                >
                  <Icon className={cn("w-5 h-5", theme === value ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-medium", theme === value ? "text-primary" : "text-muted-foreground")}>
                    {label}
                  </span>
                </button>
              ))}
            </div>

            {/* Color Theme */}
            <div className="bg-card rounded-2xl shadow-sm overflow-hidden p-4">
              <div className="grid grid-cols-4 gap-3">
                {colorThemes.map((ct) => (
                  <button
                    key={ct}
                    onClick={() => setColorTheme(ct)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200",
                      "hover:bg-secondary/50 active:scale-[0.95]",
                      colorTheme === ct && "ring-2 ring-primary bg-primary/10"
                    )}
                  >
                    <div className="flex gap-0.5">
                      {colorThemePreview[ct].map((color, i) => (
                        <div key={i} className="w-5 h-5 rounded-full" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                    <span className={cn("text-xs font-medium", colorTheme === ct ? "text-primary" : "text-muted-foreground")}>
                      {colorThemeLabels[ct]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Background */}
            <button
              onClick={() => setBgPickerOpen(true)}
              className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl shadow-sm hover:bg-secondary/50 transition-colors active:scale-[0.98]"
            >
              <div
                className="w-12 h-12 rounded-2xl border-2 border-border overflow-hidden flex items-center justify-center"
                style={
                  globalBackground.type === "gradient" || globalBackground.type === "color"
                    ? { background: globalBackground.value }
                    : globalBackground.type === "image"
                      ? { backgroundImage: `url(${globalBackground.value})`, backgroundSize: "cover" }
                      : { backgroundColor: "hsl(var(--background))" }
                }
              >
                {globalBackground.type === "none" && <ImageIcon className="w-5 h-5 text-muted-foreground" />}
              </div>
              <div className="text-left">
                <p className="font-semibold text-[0.938rem]">{t("settings.changeBackground")}</p>
                <p className="text-xs text-muted-foreground">{t("settings.backgroundDesc")}</p>
              </div>
            </button>
          </div>
        </CollapsibleSection>

        {/* ──────────── SPRACHE ──────────── */}
        <CollapsibleSection icon={Globe} title={t("settings.language")} delay="70ms">
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
                {locale === code && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
              </button>
            ))}
          </div>
        </CollapsibleSection>

        {/* ──────────── BARRIEREFREIHEIT ──────────── */}
        <CollapsibleSection icon={Eye} title={t("settings.accessibility")} delay="80ms">
          <div className="space-y-3">
            <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
              <ToggleRow icon={Type} label={t("settings.dyslexiaFont")} checked={a11y.dyslexiaFont} onChange={() => a11y.toggle("dyslexiaFont")} />
              <ToggleRow icon={Eye} label={t("settings.largeText")} checked={a11y.largeText} onChange={() => a11y.toggle("largeText")} />
              <ToggleRow icon={Contrast} label={t("settings.highContrast")} checked={a11y.highContrast} onChange={() => a11y.toggle("highContrast")} />
              <ToggleRow icon={Headphones} label={t("settings.headphoneAutoPlay")} checked={a11y.headphoneAutoPlay} onChange={() => a11y.toggle("headphoneAutoPlay")} />
              <ToggleRow icon={SpellCheck} label={t("settings.autoCorrect")} checked={a11y.autoCorrect} onChange={() => a11y.toggle("autoCorrect")} borderBottom={false} />
            </div>

            {/* Speech Rate */}
            <div className="bg-card rounded-2xl shadow-sm overflow-hidden px-4 py-3.5">
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-muted-foreground" />
                  <span className="text-[0.938rem]">{t("settings.speechRate")}</span>
                </span>
                <span className="text-sm font-semibold text-primary">{a11y.speechRate}×</span>
              </div>
              <div className="flex gap-2">
                {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => a11y.setSpeechRate(rate)}
                    className={cn(
                      "flex-1 h-10 rounded-xl text-sm font-medium transition-all active:scale-95",
                      a11y.speechRate === rate
                        ? "gradient-primary text-primary-foreground shadow-soft"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    )}
                  >
                    {rate}×
                  </button>
                ))}
              </div>
            </div>

            {/* Smart Silence */}
            <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
              <ToggleRow
                icon={BellOff}
                label={t("settings.smartSilence")}
                description={t("settings.smartSilenceDesc")}
                checked={a11y.smartSilence}
                onChange={() => a11y.toggle("smartSilence")}
                borderBottom={false}
              />
              {a11y.smartSilence && (
                <div className="px-4 pb-3.5 flex gap-3 items-center">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground block mb-1">{t("settings.quietFrom")}</label>
                    <input
                      type="time"
                      value={a11y.quietHoursStart}
                      onChange={(e) => a11y.setQuietHours(e.target.value, a11y.quietHoursEnd)}
                      className="w-full h-10 rounded-xl bg-secondary px-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground block mb-1">{t("settings.quietTo")}</label>
                    <input
                      type="time"
                      value={a11y.quietHoursEnd}
                      onChange={(e) => a11y.setQuietHours(a11y.quietHoursStart, e.target.value)}
                      className="w-full h-10 rounded-xl bg-secondary px-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
              <ToggleRow icon={AlignLeft} label={t("settings.compactMode")} description={t("settings.compactModeDesc")} checked={a11y.compactMode} onChange={() => a11y.toggle("compactMode")} />
              <ToggleRow icon={VolumeX} label={t("settings.muteSounds")} description={t("settings.muteSoundsDesc")} checked={a11y.muteSounds} onChange={() => a11y.toggle("muteSounds")} borderBottom={false} />
            </div>
          </div>
        </CollapsibleSection>

        {/* ──────────── WEITERE LINKS ──────────── */}
        <div className="space-y-3">
          {/* Focus Mode */}
          <button
            onClick={() => navigate("/focus-mode")}
            className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl shadow-sm hover:bg-secondary/50 transition-colors active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-accent" />
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold text-[0.938rem]">{t("settings.focusMode")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.focusModeDesc")}</p>
            </div>
          </button>

          {/* Auto-Play Contact */}
          <button
            onClick={() => navigate("/contact-autoplay")}
            className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl shadow-sm hover:bg-secondary/50 transition-colors active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold text-[0.938rem] flex items-center gap-2">
                {t("settings.autoPlayContact")}
                {!isPremium && <PremiumBadge />}
              </p>
              <p className="text-xs text-muted-foreground">{t("settings.autoPlayContactDesc")}</p>
            </div>
          </button>

          {/* Install App */}
          {!window.matchMedia("(display-mode: standalone)").matches && !(window.navigator as any).standalone && (
            <button
              onClick={() => navigate("/install")}
              className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl shadow-sm hover:bg-secondary/50 transition-colors active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Download className="w-5 h-5 text-accent" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-[0.938rem]">{t("settings.installApp")}</p>
                <p className="text-xs text-muted-foreground">{t("settings.installAppDesc")}</p>
              </div>
            </button>
          )}
        </div>

        {/* Stay logged in */}
        <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
          <ToggleRow
            icon={KeyRound}
            label={t("settings.stayLoggedIn")}
            description={t("settings.stayLoggedInDesc")}
            checked={stayLoggedIn}
            onChange={toggleStayLoggedIn}
            borderBottom={false}
          />
        </div>

        {/* Subscription */}
        {!(isFoundingUser && daysRemaining === -1) && (
          <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isPremium ? "gradient-primary" : "bg-muted")}>
                    <Crown className={cn("w-5 h-5", isPremium ? "text-primary-foreground" : "text-muted-foreground")} />
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
                <button
                  onClick={handleRefreshSubscription}
                  disabled={refreshingSubscription}
                  className="p-2 rounded-full hover:bg-secondary transition-colors disabled:opacity-60"
                  aria-label="Premium-Status aktualisieren"
                >
                  <RefreshCw className={cn("w-4 h-4 text-muted-foreground", refreshingSubscription && "animate-spin")} />
                </button>
              </div>

              {/* Status line */}
              <div className="flex items-center gap-2 px-1">
                <span className={cn(
                  "w-2 h-2 rounded-full shrink-0 transition-colors",
                  isPremium ? "bg-primary" : "bg-muted-foreground/40"
                )} />
                <p className="text-xs text-muted-foreground">
                  {isPremium ? "Abo aktiv" : "Kein aktives Abo"}
                  {lastChecked && (
                    <> · Zuletzt geprüft {lastChecked.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</>
                  )}
                </p>
              </div>

              {!isPremium && (
                <button
                  onClick={startCheckout}
                  disabled={checkoutLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-60"
                >
                  {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  {t("sub.subscribe")}
                </button>
              )}
              {stripeActive && (
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary text-foreground font-medium text-sm transition-all active:scale-[0.97] disabled:opacity-60"
                >
                  {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  {t("sub.manage")}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Logout */}
        <div className="animate-reveal-up" style={{ animationDelay: "100ms" }}>
          {!showLogoutConfirm ? (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center justify-center gap-3 p-4 bg-destructive/10 text-destructive rounded-2xl shadow-sm hover:bg-destructive/20 transition-colors active:scale-[0.98] font-semibold"
            >
              <LogOut className="w-5 h-5" />
              {t("settings.logout")}
            </button>
          ) : (
            <div className="bg-card rounded-2xl shadow-sm p-4 space-y-3 border border-destructive/20">
              <p className="text-sm text-center text-muted-foreground">{t("settings.logoutConfirm")}</p>
              <div className="flex gap-3">
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground font-medium text-sm">
                  {t("a11y.back")}
                </button>
                <button onClick={handleLogout} className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-medium text-sm">
                  {t("settings.logout")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Legal */}
        <CollapsibleSection icon={Lock} title={t("settings.legal")} delay="110ms">
          <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => navigate("/privacy")}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/50 transition-colors border-b border-border"
            >
              <Shield className="w-5 h-5 text-muted-foreground" />
              <div>
                <span className="text-[0.938rem] block">{t("settings.privacy")}</span>
                <span className="text-xs text-muted-foreground">{t("settings.privacyDesc")}</span>
              </div>
            </button>
            <button
              onClick={() => navigate("/terms")}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/50 transition-colors"
            >
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div>
                <span className="text-[0.938rem] block">{t("settings.terms")}</span>
                <span className="text-xs text-muted-foreground">{t("settings.termsDesc")}</span>
              </div>
            </button>
          </div>
        </CollapsibleSection>
      </div>

      <BackgroundPicker
        open={bgPickerOpen}
        onClose={() => setBgPickerOpen(false)}
        current={globalBackground}
        onSelect={setGlobalBackground}
      />
    </div>
  );
};

export default SettingsPage;
