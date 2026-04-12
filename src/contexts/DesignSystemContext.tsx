import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from "react";

// ─── Types ───────────────────────────────────────────────
export interface DesignColors {
  hue: number;        // 0–360
  saturation: number; // 0–100
  lightness: number;  // 0–100
}

export type SparkleSize = "small" | "medium" | "large";
export type SparkleSpeed = "slow" | "medium" | "fast";

export interface MagicModeSettings {
  enabled: boolean;
  sparkleIntensity: number; // 0–100
  sparkleSize: SparkleSize;
  sparkleSpeed: SparkleSpeed;
  sparkleDensity: number;   // 1–50
}

export type DesignPreset = "custom" | "softMagic" | "galaxy" | "elegant" | "neon";

export interface DesignSystemState {
  colors: DesignColors;
  magic: MagicModeSettings;
  preset: DesignPreset;
}

interface DesignSystemContextType {
  state: DesignSystemState;
  setColors: (c: Partial<DesignColors>) => void;
  setMagic: (m: Partial<MagicModeSettings>) => void;
  applyPreset: (p: DesignPreset) => void;
  computedColors: ComputedColors;
}

export interface ComputedColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  effectColor: string;
}

// ─── Presets ─────────────────────────────────────────────
const presets: Record<Exclude<DesignPreset, "custom">, { colors: DesignColors; magic: MagicModeSettings }> = {
  softMagic: {
    colors: { hue: 300, saturation: 40, lightness: 65 },
    magic: { enabled: true, sparkleIntensity: 25, sparkleSize: "small", sparkleSpeed: "slow", sparkleDensity: 12 },
  },
  galaxy: {
    colors: { hue: 260, saturation: 70, lightness: 45 },
    magic: { enabled: true, sparkleIntensity: 50, sparkleSize: "medium", sparkleSpeed: "medium", sparkleDensity: 20 },
  },
  elegant: {
    colors: { hue: 220, saturation: 15, lightness: 50 },
    magic: { enabled: false, sparkleIntensity: 0, sparkleSize: "small", sparkleSpeed: "slow", sparkleDensity: 5 },
  },
  neon: {
    colors: { hue: 160, saturation: 100, lightness: 50 },
    magic: { enabled: true, sparkleIntensity: 70, sparkleSize: "large", sparkleSpeed: "fast", sparkleDensity: 30 },
  },
};

// ─── Default state ───────────────────────────────────────
const defaultState: DesignSystemState = {
  colors: { hue: 18, saturation: 90, lightness: 55 },
  magic: { enabled: false, sparkleIntensity: 30, sparkleSize: "medium", sparkleSpeed: "slow", sparkleDensity: 15 },
  preset: "custom",
};

// ─── Color utilities ─────────────────────────────────────
function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function relativeLuminance(h: number, s: number, l: number): number {
  // Approximate luminance from HSL lightness
  return l / 100;
}

function ensureContrast(bgL: number): { textPrimaryL: number; textSecondaryL: number } {
  // WCAG AA requires 4.5:1 for normal text
  if (bgL > 50) {
    return { textPrimaryL: 10, textSecondaryL: 35 };
  }
  return { textPrimaryL: 95, textSecondaryL: 70 };
}

function computeColors(c: DesignColors, isDark: boolean): ComputedColors {
  const { hue, saturation, lightness } = c;
  
  // Secondary: complementary shift or lighter version
  const secHue = (hue + 30) % 360;
  const secSat = Math.max(saturation - 15, 10);
  const secLight = Math.min(lightness + 15, 85);

  // Background
  const bgLight = isDark ? 7 : 97;
  const bgSat = isDark ? 25 : 20;

  // Surface (cards)
  const surfLight = isDark ? 12 : 100;
  const surfSat = isDark ? 20 : 0;

  const { textPrimaryL, textSecondaryL } = ensureContrast(bgLight);

  return {
    primary: `${hue} ${saturation}% ${lightness}%`,
    secondary: `${secHue} ${secSat}% ${secLight}%`,
    background: `${hue} ${bgSat}% ${bgLight}%`,
    surface: `${hue} ${surfSat}% ${surfLight}%`,
    textPrimary: `${hue} 20% ${textPrimaryL}%`,
    textSecondary: `${hue} 10% ${textSecondaryL}%`,
    effectColor: `${hue} ${saturation}% ${lightness}%`,
  };
}

// ─── Context ─────────────────────────────────────────────
const DesignSystemContext = createContext<DesignSystemContextType | undefined>(undefined);

export const useDesignSystem = () => {
  const ctx = useContext(DesignSystemContext);
  if (!ctx) throw new Error("useDesignSystem must be used within DesignSystemProvider");
  return ctx;
};

const STORAGE_KEY = "clemio-design-system";

export const DesignSystemProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<DesignSystemState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...defaultState, ...JSON.parse(saved) };
    } catch {}
    return defaultState;
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const isDark = document.documentElement.classList.contains("dark");
  const computedColors = useMemo(() => computeColors(state.colors, isDark), [state.colors, isDark]);

  // Apply CSS variables to root
  useEffect(() => {
    const root = document.documentElement;
    const cc = computedColors;

    root.style.setProperty("--primary", cc.primary);
    root.style.setProperty("--ring", cc.primary);
    root.style.setProperty("--chat-mine", cc.primary);
    root.style.setProperty("--sidebar-ring", cc.primary);
    root.style.setProperty("--background", cc.background);
    root.style.setProperty("--foreground", cc.textPrimary);
    root.style.setProperty("--card", cc.surface);
    root.style.setProperty("--card-foreground", cc.textPrimary);
    root.style.setProperty("--popover", cc.surface);
    root.style.setProperty("--popover-foreground", cc.textPrimary);
    root.style.setProperty("--muted-foreground", cc.textSecondary);
    root.style.setProperty("--accent", cc.secondary);

    return () => {
      ["--primary","--ring","--chat-mine","--sidebar-ring","--background","--foreground",
       "--card","--card-foreground","--popover","--popover-foreground","--muted-foreground","--accent"]
        .forEach(k => root.style.removeProperty(k));
    };
  }, [computedColors]);

  // Re-apply on dark/light mode change
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const nowDark = document.documentElement.classList.contains("dark");
      const cc = computeColors(state.colors, nowDark);
      const root = document.documentElement;
      root.style.setProperty("--primary", cc.primary);
      root.style.setProperty("--ring", cc.primary);
      root.style.setProperty("--chat-mine", cc.primary);
      root.style.setProperty("--background", cc.background);
      root.style.setProperty("--foreground", cc.textPrimary);
      root.style.setProperty("--card", cc.surface);
      root.style.setProperty("--card-foreground", cc.textPrimary);
      root.style.setProperty("--popover", cc.surface);
      root.style.setProperty("--popover-foreground", cc.textPrimary);
      root.style.setProperty("--muted-foreground", cc.textSecondary);
      root.style.setProperty("--accent", cc.secondary);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [state.colors]);

  const setColors = useCallback((c: Partial<DesignColors>) => {
    setState(prev => ({ ...prev, colors: { ...prev.colors, ...c }, preset: "custom" }));
  }, []);

  const setMagic = useCallback((m: Partial<MagicModeSettings>) => {
    setState(prev => ({ ...prev, magic: { ...prev.magic, ...m }, preset: "custom" }));
  }, []);

  const applyPreset = useCallback((p: DesignPreset) => {
    if (p === "custom") {
      setState(prev => ({ ...prev, preset: "custom" }));
      return;
    }
    const preset = presets[p];
    setState({ colors: { ...preset.colors }, magic: { ...preset.magic }, preset: p });
  }, []);

  const value = useMemo(() => ({
    state, setColors, setMagic, applyPreset, computedColors,
  }), [state, setColors, setMagic, applyPreset, computedColors]);

  return (
    <DesignSystemContext.Provider value={value}>
      {children}
    </DesignSystemContext.Provider>
  );
};
