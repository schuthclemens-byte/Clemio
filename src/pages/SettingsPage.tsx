import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Globe, Eye, Type, Contrast, Volume2, Moon, Sun, Monitor, User, Headphones, Shield, BellOff, AlignLeft, Download, VolumeX, FileText, Lock, Palette, ImageIcon, Fingerprint } from "lucide-react";
import { useI18n, localeNames, type Locale } from "@/contexts/I18nContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useColorTheme, colorThemeLabels, colorThemePreview, type ColorTheme } from "@/contexts/ColorThemeContext";
import { useChatBackground } from "@/contexts/ChatBackgroundContext";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import BackgroundPicker from "@/components/chat/BackgroundPicker";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { locale, setLocale, t } = useI18n();
  const a11y = useAccessibility();
  const { theme, setTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();
  const { globalBackground, setGlobalBackground } = useChatBackground();
  const [bgPickerOpen, setBgPickerOpen] = useState(false);

  const languages = Object.entries(localeNames) as [Locale, string][];
  const colorThemes = Object.keys(colorThemeLabels) as ColorTheme[];

  const toggleItems = [
    { key: "dyslexiaFont" as const, icon: Type, label: t("settings.dyslexiaFont") },
    { key: "largeText" as const, icon: Eye, label: t("settings.largeText") },
    { key: "highContrast" as const, icon: Contrast, label: t("settings.highContrast") },
    { key: "autoRead" as const, icon: Volume2, label: t("settings.autoRead") },
    { key: "headphoneAutoPlay" as const, icon: Headphones, label: "Kopfhörer Auto-Play" },
  ];

  const themeOptions = [
    { value: "system" as const, icon: Monitor, label: t("settings.themeSystem") || "System" },
    { value: "light" as const, icon: Sun, label: t("settings.themeLight") || "Hell" },
    { value: "dark" as const, icon: Moon, label: t("settings.themeDark") || "Dunkel" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
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
            <p className="font-semibold text-[0.938rem]">{t("settings.profile") || "Profil bearbeiten"}</p>
            <p className="text-xs text-muted-foreground">{t("settings.profileDesc") || "Name, Bild & Sprache"}</p>
          </div>
        </button>

        {/* Focus Mode link */}
        <button
          onClick={() => navigate("/focus-mode")}
          className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl shadow-sm hover:bg-secondary/50 transition-colors active:scale-[0.98] animate-reveal-up"
          style={{ animationDelay: "30ms" }}
        >
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-accent" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-[0.938rem]">Fokus-Modus</p>
            <p className="text-xs text-muted-foreground">Nur wichtige Kontakte vorlesen</p>
          </div>
        </button>

        {/* Contact Auto-Play link */}
        <button
          onClick={() => navigate("/contact-autoplay")}
          className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl shadow-sm hover:bg-secondary/50 transition-colors active:scale-[0.98] animate-reveal-up"
          style={{ animationDelay: "60ms" }}
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Volume2 className="w-6 h-6 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-[0.938rem]">Auto-Play pro Kontakt</p>
            <p className="text-xs text-muted-foreground">Wähle wer vorgelesen wird</p>
          </div>
        </button>

        {/* App installieren */}
        <button
          onClick={() => navigate("/install")}
          className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl shadow-sm hover:bg-secondary/50 transition-colors active:scale-[0.98] animate-reveal-up"
          style={{ animationDelay: "90ms" }}
        >
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
            <Download className="w-6 h-6 text-accent" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-[0.938rem]">App installieren</p>
            <p className="text-xs text-muted-foreground">Hearo auf dem Startbildschirm</p>
          </div>
        </button>

        {/* Theme */}
        <section className="animate-reveal-up">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Moon className="w-4 h-4" />
            {t("settings.theme") || "Design"}
          </h2>
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
        </section>

        {/* Color Theme */}
        <section className="animate-reveal-up" style={{ animationDelay: "40ms" }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Farbthema
          </h2>
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
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    colorTheme === ct ? "text-primary" : "text-muted-foreground"
                  )}>
                    {colorThemeLabels[ct]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Chat Background */}
        <section className="animate-reveal-up" style={{ animationDelay: "50ms" }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Chat-Hintergrund
          </h2>
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
                    ? { backgroundImage: `url(${globalBackground.value})`, backgroundSize: "cover", backgroundPosition: "center" }
                    : { backgroundColor: "hsl(var(--background))" }
              }
            >
              {globalBackground.type === "none" && <ImageIcon className="w-5 h-5 text-muted-foreground" />}
            </div>
            <div className="text-left">
              <p className="font-semibold text-[0.938rem]">Hintergrund ändern</p>
              <p className="text-xs text-muted-foreground">Farbe, Verlauf oder eigenes Bild</p>
            </div>
          </button>
        </section>


        <section className="animate-reveal-up" style={{ animationDelay: "60ms" }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            {t("settings.language")}
          </h2>
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

        {/* Accessibility */}
        <section className="animate-reveal-up" style={{ animationDelay: "120ms" }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t("settings.accessibility")}
          </h2>
          <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
            {toggleItems.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => a11y.toggle(key)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors",
                  "hover:bg-secondary/50 active:scale-[0.99]",
                  "border-b border-border last:border-b-0"
                )}
                role="switch"
                aria-checked={a11y[key]}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4.5 h-4.5 text-muted-foreground" />
                  <span className="text-[0.938rem]">{label}</span>
                </span>
                <div
                  className={cn(
                    "w-11 h-6 rounded-full relative transition-colors duration-200",
                    a11y[key] ? "bg-primary" : "bg-border"
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-0.5 w-5 h-5 rounded-full bg-card shadow-sm transition-transform duration-200",
                      a11y[key] ? "translate-x-[1.375rem]" : "translate-x-0.5"
                    )}
                  />
                </div>
              </button>
            ))}
          </div>

          {/* Speech Rate */}
          <div className="bg-card rounded-2xl shadow-sm overflow-hidden mt-3">
            <div className="px-4 py-3.5">
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-3">
                  <Volume2 className="w-4.5 h-4.5 text-muted-foreground" />
                  <span className="text-[0.938rem]">Vorlesegeschwindigkeit</span>
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
          </div>

          {/* Smart Silence */}
          <div className="bg-card rounded-2xl shadow-sm overflow-hidden mt-3">
            <button
              onClick={() => a11y.toggle("smartSilence")}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-secondary/50"
              role="switch"
              aria-checked={a11y.smartSilence}
            >
              <span className="flex items-center gap-3">
                <BellOff className="w-4.5 h-4.5 text-muted-foreground" />
                <div>
                  <span className="text-[0.938rem] block">Smart Silence</span>
                  <span className="text-xs text-muted-foreground">Nachts keine Wiedergabe</span>
                </div>
              </span>
              <div className={cn(
                "w-11 h-6 rounded-full relative transition-colors duration-200",
                a11y.smartSilence ? "bg-primary" : "bg-border"
              )}>
                <div className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-card shadow-sm transition-transform duration-200",
                  a11y.smartSilence ? "translate-x-[1.375rem]" : "translate-x-0.5"
                )} />
              </div>
            </button>
            {a11y.smartSilence && (
              <div className="px-4 pb-3.5 flex gap-3 items-center">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground block mb-1">Von</label>
                  <input
                    type="time"
                    value={a11y.quietHoursStart}
                    onChange={(e) => a11y.setQuietHours(e.target.value, a11y.quietHoursEnd)}
                    className="w-full h-10 rounded-xl bg-secondary px-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground block mb-1">Bis</label>
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

          {/* Compact Mode */}
          <div className="bg-card rounded-2xl shadow-sm overflow-hidden mt-3">
            <button
              onClick={() => a11y.toggle("compactMode")}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-secondary/50"
              role="switch"
              aria-checked={a11y.compactMode}
            >
              <span className="flex items-center gap-3">
                <AlignLeft className="w-4.5 h-4.5 text-muted-foreground" />
                <div>
                  <span className="text-[0.938rem] block">Weniger Text</span>
                  <span className="text-xs text-muted-foreground">Lange Nachrichten kürzen</span>
                </div>
              </span>
              <div className={cn(
                "w-11 h-6 rounded-full relative transition-colors duration-200",
                a11y.compactMode ? "bg-primary" : "bg-border"
              )}>
                <div className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-card shadow-sm transition-transform duration-200",
                  a11y.compactMode ? "translate-x-[1.375rem]" : "translate-x-0.5"
                )} />
              </div>
            </button>
          </div>

          {/* Mute Sounds */}
          <div className="bg-card rounded-2xl shadow-sm overflow-hidden mt-3">
            <button
              onClick={() => a11y.toggle("muteSounds")}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-secondary/50"
              role="switch"
              aria-checked={a11y.muteSounds}
            >
              <span className="flex items-center gap-3">
                <VolumeX className="w-4.5 h-4.5 text-muted-foreground" />
                <div>
                  <span className="text-[0.938rem] block">Sounds stumm</span>
                  <span className="text-xs text-muted-foreground">UI-Töne deaktivieren</span>
                </div>
              </span>
              <div className={cn(
                "w-11 h-6 rounded-full relative transition-colors duration-200",
                a11y.muteSounds ? "bg-primary" : "bg-border"
              )}>
                <div className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-card shadow-sm transition-transform duration-200",
                  a11y.muteSounds ? "translate-x-[1.375rem]" : "translate-x-0.5"
                )} />
              </div>
            </button>
          </div>
        </section>

        {/* Legal & Privacy */}
        <section className="animate-reveal-up" style={{ animationDelay: "180ms" }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Rechtliches
          </h2>
          <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => navigate("/privacy")}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/50 transition-colors border-b border-border"
            >
              <Shield className="w-4.5 h-4.5 text-muted-foreground" />
              <div>
                <span className="text-[0.938rem] block">Datenschutzerklärung</span>
                <span className="text-xs text-muted-foreground">Was wir speichern & wie wir es schützen</span>
              </div>
            </button>
            <button
              onClick={() => navigate("/terms")}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-secondary/50 transition-colors"
            >
              <FileText className="w-4.5 h-4.5 text-muted-foreground" />
              <div>
                <span className="text-[0.938rem] block">Nutzungsbedingungen</span>
                <span className="text-xs text-muted-foreground">Regeln für die Nutzung von Hearo</span>
              </div>
            </button>
          </div>
        </section>
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
