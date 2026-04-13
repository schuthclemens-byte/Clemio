import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Palette, Sun, Moon, Monitor, Wand2 } from "lucide-react";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { useI18n } from "@/contexts/I18nContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useDesignSystem, type DesignPreset, type SparkleMode } from "@/contexts/DesignSystemContext";
import { cn } from "@/lib/utils";
import ColorSurface from "@/components/design/ColorSurface";
import { Slider } from "@/components/ui/slider";

const presetConfigs: { id: DesignPreset; label: string; colors: string[]; icon: string }[] = [
  { id: "softMagic", label: "Soft Magic", colors: ["hsl(328,56%,62%)", "hsl(300,40%,70%)", "hsl(350,50%,65%)"], icon: "✨" },
  { id: "galaxy", label: "Galaxy", colors: ["hsl(248,78%,58%)", "hsl(240,65%,45%)", "hsl(270,60%,52%)"], icon: "🌌" },
  { id: "elegant", label: "Elegant", colors: ["hsl(214,20%,48%)", "hsl(220,15%,55%)", "hsl(200,18%,50%)"], icon: "🪶" },
  { id: "neon", label: "Neon", colors: ["hsl(168,94%,52%)", "hsl(180,90%,48%)", "hsl(150,80%,50%)"], icon: "⚡" },
];

const DesignSettingsPage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  const { state, setColors, setMagic, applyPreset } = useDesignSystem();

  const themeOptions = [
    { value: "system" as const, icon: Monitor, label: t("settings.themeSystem") },
    { value: "light" as const, icon: Sun, label: t("settings.themeLight") },
    { value: "dark" as const, icon: Moon, label: t("settings.themeDark") },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background" {...useSwipeBack({ fallbackPath: "/settings" })}>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/90 glass border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors active:scale-95"
            aria-label={t("a11y.back")}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex-1">{t("design.title")}</h1>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-6 pb-24">
        {/* ─── Theme (Light/Dark/System) ─── */}
        <section className="animate-reveal-up">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4" />
            {t("design.themeSection")}
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

        {/* ─── Color Surface ─── */}
        <section className="animate-reveal-up" style={{ animationDelay: "30ms" }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4" />
            {t("design.colorsSection")}
          </h2>
          <div className="bg-card rounded-2xl shadow-sm p-4 space-y-5">
            {/* Large Color Surface */}
            <ColorSurface
              hue={state.colors.hue}
              saturation={state.colors.saturation}
              lightness={state.colors.lightness}
              onColorChange={(hue, saturation, lightness) => setColors({ hue, saturation, lightness })}
              height={260}
            />

            {/* Saturation Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("design.saturation")}</span>
                <span className="font-semibold text-primary">{state.colors.saturation}%</span>
              </div>
              <div className="relative h-8 flex items-center">
                <div
                  className="absolute inset-x-0 h-3 rounded-full"
                  style={{
                    background: `linear-gradient(to right, hsl(${state.colors.hue}, 0%, ${state.colors.lightness}%), hsl(${state.colors.hue}, 100%, ${state.colors.lightness}%))`,
                  }}
                />
                <Slider
                  value={[state.colors.saturation]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([v]) => setColors({ saturation: v })}
                  className="relative z-10"
                />
              </div>
            </div>

            {/* Brightness Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("design.brightness")}</span>
                <span className="font-semibold text-primary">{state.colors.lightness}%</span>
              </div>
              <div className="relative h-8 flex items-center">
                <div
                  className="absolute inset-x-0 h-3 rounded-full"
                  style={{
                    background: `linear-gradient(to right, hsl(${state.colors.hue}, ${state.colors.saturation}%, 15%), hsl(${state.colors.hue}, ${state.colors.saturation}%, 50%), hsl(${state.colors.hue}, ${state.colors.saturation}%, 85%))`,
                  }}
                />
                <Slider
                  value={[state.colors.lightness]}
                  min={15}
                  max={85}
                  step={1}
                  onValueChange={([v]) => setColors({ lightness: v })}
                  className="relative z-10"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ─── Presets ─── */}
        <section className="animate-reveal-up" style={{ animationDelay: "60ms" }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
            <Wand2 className="w-4 h-4" />
            {t("design.presets")}
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {presetConfigs.map(({ id, label, colors, icon }) => (
              <button
                key={id}
                onClick={() => applyPreset(id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-2xl bg-card shadow-sm transition-all duration-200",
                  "hover:bg-secondary/50 active:scale-[0.97]",
                  state.preset === id && "ring-2 ring-primary bg-primary/10"
                )}
              >
                <span className="text-xl">{icon}</span>
                <div className="flex gap-0.5">
                  {colors.map((c, i) => (
                    <div key={i} className="w-4 h-4 rounded-full" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <span className={cn("text-[0.688rem] font-medium", state.preset === id ? "text-primary" : "text-muted-foreground")}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ─── Sparkle / Effects ─── */}
        <section className="animate-reveal-up" style={{ animationDelay: "90ms" }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4" />
            {t("design.effectsSection")}
          </h2>
          <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
            {/* Enable toggle */}
            <button
              onClick={() => setMagic({ enabled: !state.magic.enabled })}
              className="w-full flex items-center justify-between px-4 py-4 text-left transition-colors hover:bg-secondary/50 active:scale-[0.99] border-b border-border"
              role="switch"
              aria-checked={state.magic.enabled}
            >
              <span className="flex items-start gap-3 flex-1 min-w-0">
                <Sparkles className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[0.938rem] block font-medium">{t("design.magicMode")}</span>
                  <span className="text-xs text-muted-foreground leading-relaxed">{t("design.magicModeDesc")}</span>
                </div>
              </span>
              <div className={cn(
                "w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0 ml-3",
                state.magic.enabled ? "bg-primary" : "bg-border"
              )}>
                <div className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-card shadow-sm transition-transform duration-200",
                  state.magic.enabled ? "translate-x-[1.375rem]" : "translate-x-0.5"
                )} />
              </div>
            </button>

            {state.magic.enabled && (
              <div className="p-4 space-y-5">
                {/* Sparkle Mode: sparkle vs soft */}
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">{t("design.sparkleMode") || "Modus"}</span>
                  <div className="flex gap-2">
                    {(["sparkle", "soft"] as SparkleMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setMagic({ sparkleMode: mode })}
                        className={cn(
                          "flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl text-sm font-medium transition-all active:scale-95",
                          state.magic.sparkleMode === mode
                            ? "gradient-primary text-primary-foreground shadow-soft"
                            : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                        )}
                      >
                        <span className="text-lg">{mode === "sparkle" ? "✨" : "🌙"}</span>
                        <span>{mode === "sparkle" ? (t("design.modeSparkle") || "Funkeln") : (t("design.modeSoft") || "Sanft")}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Intensity */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("design.intensity")}</span>
                    <span className="font-semibold text-primary">{state.magic.sparkleIntensity}%</span>
                  </div>
                  <Slider
                    value={[state.magic.sparkleIntensity]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([v]) => setMagic({ sparkleIntensity: v })}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ─── Hint ─── */}
        <div className="text-center text-xs text-muted-foreground py-4 opacity-70">
          {t("design.liveHint")}
        </div>
      </div>
    </div>
  );
};

export default DesignSettingsPage;
