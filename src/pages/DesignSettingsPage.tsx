import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Palette, Sun, Moon, Monitor, ChevronDown, ImageIcon, Check } from "lucide-react";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { useI18n } from "@/contexts/I18nContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useDesignSystem, type DesignPreset, type SparkleMode } from "@/contexts/DesignSystemContext";
import { useChatBackground } from "@/contexts/ChatBackgroundContext";
import { cn } from "@/lib/utils";
import ColorSurface from "@/components/design/ColorSurface";
import BackgroundPicker from "@/components/chat/BackgroundPicker";
import { Slider } from "@/components/ui/slider";

const presetConfigs: { id: DesignPreset; label: string; hue: number; sat: number; light: number; accentHue: number; icon: string; desc: string; gradient: string; vibe: string }[] = [
  { id: "softMagic", label: "Soft Magic", hue: 328, sat: 56, light: 62, accentHue: 370, icon: "✨", desc: "Weich & magisch", gradient: "linear-gradient(135deg, hsl(328,56%,62%), hsl(10,50%,72%))", vibe: "Sanfte Pastelltöne mit zartem Glow" },
  { id: "elegant", label: "Elegant", hue: 214, sat: 20, light: 48, accentHue: 244, icon: "🪶", desc: "Schlicht & edel", gradient: "linear-gradient(135deg, hsl(214,20%,48%), hsl(244,18%,58%))", vibe: "Reduzierts Design, klare Linien" },
  { id: "neon", label: "Neon", hue: 168, sat: 94, light: 52, accentHue: 198, icon: "⚡", desc: "Lebendig & hell", gradient: "linear-gradient(135deg, hsl(168,94%,52%), hsl(198,80%,62%))", vibe: "Leuchtende Farben, hoher Kontrast" },
  { id: "galaxy", label: "Galaxy", hue: 248, sat: 78, light: 58, accentHue: 290, icon: "🌌", desc: "Tief & kosmisch", gradient: "linear-gradient(135deg, hsl(248,78%,58%), hsl(290,60%,68%))", vibe: "Dunkle Tiefe, kosmische Weite" },
];

/** Polished mini chat preview card that looks like a real chat interface */
const ChatPreview = ({ hue, sat, light, accentHue, compact = false }: { hue: number; sat: number; light: number; accentHue: number; compact?: boolean }) => {
  const isDark = document.documentElement.classList.contains("dark");
  const primary = `hsl(${hue}, ${sat}%, ${light}%)`;
  const accent = `hsl(${accentHue % 360}, ${Math.max(sat * 0.7, 18)}%, ${Math.min(light + 10, 80)}%)`;
  const bgColor = isDark ? "hsl(0, 0%, 8%)" : `hsl(${hue}, ${Math.max(sat * 0.3, 8)}%, 96%)`;
  const headerBg = isDark ? "hsl(0, 0%, 12%)" : `hsl(${hue}, ${Math.max(sat * 0.2, 6)}%, 93%)`;
  const theirsBg = isDark ? "hsl(0, 0%, 16%)" : `hsl(${hue}, ${Math.max(sat * 0.2, 6)}%, 91%)`;
  const theirsFg = isDark ? "hsl(0, 0%, 85%)" : "hsl(0, 0%, 15%)";
  const inputBg = isDark ? "hsl(0, 0%, 14%)" : `hsl(${hue}, ${Math.max(sat * 0.15, 4)}%, 92%)`;

  if (compact) {
    return (
      <div className="rounded-xl overflow-hidden h-[80px] w-full" style={{ background: bgColor }}>
        <div className="flex flex-col gap-1 p-2 h-full justify-center">
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-md px-2.5 py-1 max-w-[75%]" style={{ background: theirsBg, color: theirsFg }}>
              <span className="text-[0.55rem] leading-tight block">Hey! 👋</span>
            </div>
          </div>
          <div className="flex justify-end">
            <div className="rounded-2xl rounded-tr-md px-2.5 py-1 max-w-[75%]" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})`, color: "white" }}>
              <span className="text-[0.55rem] leading-tight block">Alles klar! 🎉</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-border/50 shadow-sm" style={{ background: bgColor }}>
      {/* Chat header bar */}
      <div className="flex items-center gap-2.5 px-3.5 py-2" style={{ background: headerBg }}>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[0.6rem] font-bold shrink-0"
          style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}
        >
          A
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[0.7rem] font-semibold truncate" style={{ color: theirsFg }}>Anna</p>
          <p className="text-[0.5rem]" style={{ color: isDark ? "hsl(0,0%,50%)" : "hsl(0,0%,60%)" }}>online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-1.5 px-3 py-3">
        <div className="flex justify-start">
          <div className="rounded-2xl rounded-tl-md px-3 py-1.5 max-w-[80%]" style={{ background: theirsBg, color: theirsFg }}>
            <span className="text-[0.65rem] leading-snug block">Hey, wie geht's dir? 👋</span>
            <span className="text-[0.45rem] block text-right mt-0.5 opacity-50">14:22</span>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="rounded-2xl rounded-tr-md px-3 py-1.5 max-w-[80%]" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})`, color: "white" }}>
            <span className="text-[0.65rem] leading-snug block">Mir geht's super, danke! 🎉</span>
            <span className="text-[0.45rem] block text-right mt-0.5 opacity-60">14:23</span>
          </div>
        </div>
        <div className="flex justify-start">
          <div className="rounded-2xl rounded-tl-md px-3 py-1.5 max-w-[80%]" style={{ background: theirsBg, color: theirsFg }}>
            <span className="text-[0.65rem] leading-snug block">Hast du Lust, was zu unternehmen?</span>
            <span className="text-[0.45rem] block text-right mt-0.5 opacity-50">14:24</span>
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 px-3 pb-2.5">
        <div className="flex-1 h-7 rounded-full px-3 flex items-center" style={{ background: inputBg }}>
          <span className="text-[0.55rem]" style={{ color: isDark ? "hsl(0,0%,40%)" : "hsl(0,0%,65%)" }}>Nachricht…</span>
        </div>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}
        >
          <span className="text-white text-[0.55rem]">▶</span>
        </div>
      </div>
    </div>
  );
};

const DesignSettingsPage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  const { state, setColors, setMagic, applyPreset } = useDesignSystem();
  const { globalBackground, setGlobalBackground } = useChatBackground();
  const [bgPickerOpen, setBgPickerOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const themeOptions = [
    { value: "system" as const, icon: Monitor, label: t("settings.themeSystem") },
    { value: "light" as const, icon: Sun, label: t("settings.themeLight") },
    { value: "dark" as const, icon: Moon, label: t("settings.themeDark") },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background" {...useSwipeBack({ fallbackPath: "/chats" })}>
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
          <Palette className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold flex-1">Design</h1>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-5 pb-28">

        {/* ─── Live Preview ─── */}
        <section>
          <ChatPreview
            hue={state.colors.hue}
            sat={state.colors.saturation}
            light={state.colors.lightness}
            accentHue={state.colors.hue + 42}
          />
        </section>

        {/* ─── Theme Toggle (compact inline) ─── */}
        <section className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium shrink-0">Theme</span>
          <div className="flex gap-1 bg-card rounded-xl p-1 flex-1">
            {themeOptions.map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                  "active:scale-[0.97]",
                  theme === value
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-secondary/50"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ─── Presets (MAIN FEATURE) ─── */}
        <section>
          <h2 className="text-sm font-bold text-foreground mb-3">Wähle dein Design</h2>
          <div className="grid grid-cols-2 gap-3">
            {presetConfigs.map(({ id, label, hue, sat, light, accentHue, icon, desc }) => {
              const isActive = state.preset === id;
              return (
                <button
                  key={id}
                  onClick={() => applyPreset(id)}
                  className={cn(
                    "relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 active:scale-[0.97]",
                    "border-2",
                    isActive
                      ? "border-primary shadow-soft"
                      : "border-border/50 hover:border-border"
                  )}
                >
                  {/* Check badge */}
                  {isActive && (
                    <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                  )}

                  {/* Mini chat preview */}
                  <ChatPreview hue={hue} sat={sat} light={light} accentHue={accentHue} compact />

                  {/* Label area */}
                  <div className="p-3 bg-card">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{icon}</span>
                      <div className="text-left">
                        <p className={cn("text-sm font-semibold", isActive ? "text-primary" : "text-foreground")}>{label}</p>
                        <p className="text-[0.65rem] text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ─── Chat Background ─── */}
        <section>
          <button
            onClick={() => setBgPickerOpen(true)}
            className="w-full flex items-center gap-3 p-3.5 bg-card rounded-2xl hover:bg-secondary/50 transition-colors active:scale-[0.98]"
          >
            <div
              className="w-10 h-10 rounded-xl border-2 border-border overflow-hidden flex items-center justify-center shrink-0"
              style={
                globalBackground.type === "gradient" || globalBackground.type === "color"
                  ? { background: globalBackground.value }
                  : globalBackground.type === "image"
                    ? { backgroundImage: `url(${globalBackground.value})`, backgroundSize: "cover" }
                    : { backgroundColor: "hsl(var(--background))" }
              }
            >
              {globalBackground.type === "none" && <ImageIcon className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold text-sm">{t("settings.changeBackground")}</p>
              <p className="text-[0.7rem] text-muted-foreground">{t("settings.backgroundDesc")}</p>
            </div>
          </button>
        </section>

        {/* ─── Effects (Magic Mode) ─── */}
        <section className="bg-card rounded-2xl overflow-hidden">
          <button
            onClick={() => setMagic({ enabled: !state.magic.enabled })}
            className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-secondary/50 active:scale-[0.99]"
            role="switch"
            aria-checked={state.magic.enabled}
          >
            <span className="flex items-center gap-3 flex-1 min-w-0">
              <Sparkles className={cn("w-5 h-5 shrink-0", state.magic.enabled ? "text-primary" : "text-muted-foreground")} />
              <div className="min-w-0">
                <span className="text-sm block font-semibold">{t("design.magicMode")}</span>
                <span className="text-[0.7rem] text-muted-foreground">{t("design.magicModeDesc")}</span>
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
            <div className="px-4 pb-4 space-y-4 border-t border-border">
              <div className="flex gap-2 pt-3">
                {(["sparkle", "soft"] as SparkleMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setMagic({ sparkleMode: mode })}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95",
                      state.magic.sparkleMode === mode
                        ? "gradient-primary text-primary-foreground shadow-soft"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    <span className="text-base">{mode === "sparkle" ? "✨" : "🌙"}</span>
                    <span className="text-xs">{mode === "sparkle" ? "Funkeln" : "Sanft"}</span>
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
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
        </section>

        {/* ─── Advanced (Collapsible Color Editor) ─── */}
        <section>
          <button
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="w-full flex items-center justify-between py-2"
          >
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Palette className="w-4 h-4 text-muted-foreground" />
              Erweitert
            </h2>
            <ChevronDown className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200",
              advancedOpen && "rotate-180"
            )} />
          </button>

          <div className={cn(
            "overflow-hidden transition-all duration-300",
            advancedOpen ? "max-h-[600px] opacity-100 mt-3" : "max-h-0 opacity-0"
          )}>
            <div className="bg-card rounded-2xl p-4 space-y-4">
              <ColorSurface
                hue={state.colors.hue}
                saturation={state.colors.saturation}
                lightness={state.colors.lightness}
                onColorChange={(hue, saturation, lightness) => setColors({ hue, saturation, lightness })}
                height={200}
              />

              {/* Saturation */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{t("design.saturation")}</span>
                  <span className="font-semibold text-primary">{state.colors.saturation}%</span>
                </div>
                <div className="relative h-7 flex items-center">
                  <div
                    className="absolute inset-x-0 h-2.5 rounded-full"
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

              {/* Brightness */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{t("design.brightness")}</span>
                  <span className="font-semibold text-primary">{state.colors.lightness}%</span>
                </div>
                <div className="relative h-7 flex items-center">
                  <div
                    className="absolute inset-x-0 h-2.5 rounded-full"
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

export default DesignSettingsPage;