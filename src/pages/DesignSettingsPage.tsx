import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Palette, Sun, Moon, Monitor, Wand2 } from "lucide-react";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { useI18n } from "@/contexts/I18nContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useDesignSystem, type DesignPreset, type SparkleSize, type SparkleSpeed } from "@/contexts/DesignSystemContext";
import { cn } from "@/lib/utils";
import ColorWheel from "@/components/design/ColorWheel";
import { Slider } from "@/components/ui/slider";

const presetConfigs: { id: DesignPreset; labelKey: string; colors: string[]; icon: string }[] = [
  { id: "softMagic", labelKey: "design.presetSoftMagic", colors: ["hsl(300,40%,65%)", "hsl(330,35%,75%)", "hsl(270,30%,70%)"], icon: "✨" },
  { id: "galaxy", labelKey: "design.presetGalaxy", colors: ["hsl(260,70%,45%)", "hsl(240,65%,40%)", "hsl(280,60%,50%)"], icon: "🌌" },
  { id: "elegant", labelKey: "design.presetElegant", colors: ["hsl(220,15%,50%)", "hsl(210,10%,60%)", "hsl(200,12%,55%)"], icon: "🪶" },
  { id: "neon", labelKey: "design.presetNeon", colors: ["hsl(160,100%,50%)", "hsl(280,100%,60%)", "hsl(50,100%,55%)"], icon: "⚡" },
];

const sizeLabelKey: Record<SparkleSize, string> = { small: "design.sizeSmall", medium: "design.sizeMedium", large: "design.sizeLarge" };
const speedLabelKey: Record<SparkleSpeed, string> = { slow: "design.speedSlow", medium: "design.speedMedium", fast: "design.speedFast" };

const DesignSettingsPage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  const { state, setColors, setMagic, applyPreset, computedColors } = useDesignSystem();

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
        {/* ─── Theme Section ─── */}
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

        {/* ─── Colors Section ─── */}
        <section className="animate-reveal-up" style={{ animationDelay: "30ms" }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4" />
            {t("design.colorsSection")}
          </h2>
          <div className="bg-card rounded-2xl shadow-sm p-6 space-y-6">
            {/* Color Wheel */}
            <div className="flex justify-center">
              <ColorWheel
                hue={state.colors.hue}
                saturation={state.colors.saturation}
                lightness={state.colors.lightness}
                onHueChange={(hue) => setColors({ hue })}
                size={200}
              />
            </div>

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
                    background: `linear-gradient(to right, hsl(${state.colors.hue}, ${state.colors.saturation}%, 10%), hsl(${state.colors.hue}, ${state.colors.saturation}%, 50%), hsl(${state.colors.hue}, ${state.colors.saturation}%, 90%))`,
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
          <div className="grid grid-cols-2 gap-3">
            {presetConfigs.map(({ id, labelKey, colors, icon }) => (
              <button
                key={id}
                onClick={() => applyPreset(id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-2xl bg-card shadow-sm transition-all duration-200",
                  "hover:bg-secondary/50 active:scale-[0.97]",
                  state.preset === id && "ring-2 ring-primary bg-primary/10"
                )}
              >
                <span className="text-2xl">{icon}</span>
                <div className="flex gap-1">
                  {colors.map((c, i) => (
                    <div key={i} className="w-5 h-5 rounded-full" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <span className={cn("text-xs font-medium", state.preset === id ? "text-primary" : "text-muted-foreground")}>
                  {t(labelKey)}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ─── Magic Mode / Effects ─── */}
        <section className="animate-reveal-up" style={{ animationDelay: "90ms" }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4" />
            {t("design.effectsSection")}
          </h2>
          <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
            {/* Toggle */}
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

                {/* Density */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("design.density")}</span>
                    <span className="font-semibold text-primary">{state.magic.sparkleDensity}</span>
                  </div>
                  <Slider
                    value={[state.magic.sparkleDensity]}
                    min={1}
                    max={50}
                    step={1}
                    onValueChange={([v]) => setMagic({ sparkleDensity: v })}
                  />
                </div>

                {/* Size */}
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">{t("design.size")}</span>
                  <div className="flex gap-2">
                    {(["small", "medium", "large"] as SparkleSize[]).map(s => (
                      <button
                        key={s}
                        onClick={() => setMagic({ sparkleSize: s })}
                        className={cn(
                          "flex-1 h-10 rounded-xl text-sm font-medium transition-all active:scale-95",
                          state.magic.sparkleSize === s
                            ? "gradient-primary text-primary-foreground shadow-soft"
                            : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                        )}
                      >
                        {t(sizeLabelKey[s])}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Speed */}
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">{t("design.speed")}</span>
                  <div className="flex gap-2">
                    {(["slow", "medium", "fast"] as SparkleSpeed[]).map(s => (
                      <button
                        key={s}
                        onClick={() => setMagic({ sparkleSpeed: s })}
                        className={cn(
                          "flex-1 h-10 rounded-xl text-sm font-medium transition-all active:scale-95",
                          state.magic.sparkleSpeed === s
                            ? "gradient-primary text-primary-foreground shadow-soft"
                            : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                        )}
                      >
                        {t(speedLabelKey[s])}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ─── Live Preview ─── */}
        <section className="animate-reveal-up" style={{ animationDelay: "120ms" }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t("design.livePreview")}
          </h2>
          <div className="bg-card rounded-2xl shadow-sm p-4 space-y-3 overflow-hidden relative">
            {/* Background hint */}
            <div className="absolute inset-0 opacity-5" style={{ background: `hsl(${state.colors.hue}, ${state.colors.saturation}%, ${state.colors.lightness}%)` }} />
            
            {/* Fake chat bubbles */}
            <div className="relative z-10 space-y-2">
              <div className="flex justify-start">
                <div className="bubble-glass-theirs px-4 py-2.5 rounded-2xl max-w-[75%]">
                  <p className="text-sm">{t("design.previewMsgTheirs")}</p>
                  <span className="text-[10px] text-muted-foreground mt-1 block text-right">14:32</span>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bubble-glass-mine px-4 py-2.5 rounded-2xl max-w-[75%]" style={{
                  background: `linear-gradient(135deg, hsl(${state.colors.hue} ${state.colors.saturation}% ${state.colors.lightness}% / 0.95), hsl(${(state.colors.hue + 30) % 360} ${Math.max(state.colors.saturation - 10, 20)}% ${Math.min(state.colors.lightness + 5, 80)}% / 0.9))`,
                }}>
                  <p className="text-sm text-primary-foreground">{t("design.previewMsgMine")}</p>
                  <span className="text-[10px] text-primary-foreground/70 mt-1 block text-right">14:33 ✓✓</span>
                </div>
              </div>
            </div>

            {/* Preview buttons */}
            <div className="relative z-10 flex gap-2 pt-2">
              <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground transition-all" style={{
                background: `linear-gradient(135deg, hsl(${state.colors.hue}, ${state.colors.saturation}%, ${state.colors.lightness}%), hsl(${(state.colors.hue + 40) % 360}, ${state.colors.saturation}%, ${state.colors.lightness}%))`,
              }}>
                {t("design.previewButton")}
              </button>
              <button className="flex-1 py-2.5 rounded-xl bg-secondary text-sm font-medium text-foreground">
                {t("design.previewSecondary")}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DesignSettingsPage;
