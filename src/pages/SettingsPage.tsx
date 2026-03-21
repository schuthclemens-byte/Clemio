import { useNavigate } from "react-router-dom";
import { ArrowLeft, Globe, Eye, Type, Contrast, Volume2, Moon, Sun, Monitor, User, Headphones } from "lucide-react";
import { useI18n, localeNames, type Locale } from "@/contexts/I18nContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { locale, setLocale, t } = useI18n();
  const a11y = useAccessibility();
  const { theme, setTheme } = useTheme();

  const languages = Object.entries(localeNames) as [Locale, string][];

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

        {/* Language */}
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
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
