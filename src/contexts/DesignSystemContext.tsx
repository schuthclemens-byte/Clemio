import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface DesignColors {
  hue: number;
  saturation: number;
  lightness: number;
}

export type SparkleSize = "small" | "medium" | "large";
export type SparkleSpeed = "slow" | "medium" | "fast";
export type SparkleMode = "sparkle" | "soft";

export interface MagicModeSettings {
  enabled: boolean;
  sparkleIntensity: number;
  sparkleSize: SparkleSize;
  sparkleSpeed: SparkleSpeed;
  sparkleDensity: number;
  sparkleMode: SparkleMode;
}

export type DesignPreset = "custom" | "softMagic" | "galaxy" | "elegant" | "neon";

export interface DesignSystemState {
  colors: DesignColors;
  magic: MagicModeSettings;
  preset: DesignPreset;
}

export interface GlobalTheme {
  primaryColor: string;
  primaryForeground: string;
  secondaryColor: string;
  secondaryForeground: string;
  backgroundColor: string;
  surfaceColor: string;
  surfaceMutedColor: string;
  textPrimary: string;
  textSecondary: string;
  effectColor: string;
  borderColor: string;
  chatTheirsColor: string;
  sidebarBackgroundColor: string;
  sidebarAccentColor: string;
  sparkleIntensity: number;
  magicMode: boolean;
}

export type ComputedColors = GlobalTheme;

interface DesignSystemContextType {
  state: DesignSystemState;
  theme: GlobalTheme;
  computedColors: ComputedColors;
  setColors: (colors: Partial<DesignColors>) => void;
  setMagic: (magic: Partial<MagicModeSettings>) => void;
  applyPreset: (preset: DesignPreset) => void;
}

const STORAGE_KEY = "clemio-design-system";

const defaultState: DesignSystemState = {
  colors: { hue: 18, saturation: 90, lightness: 55 },
  magic: { enabled: false, sparkleIntensity: 24, sparkleSize: "small", sparkleSpeed: "slow", sparkleDensity: 10, sparkleMode: "sparkle" as SparkleMode },
  preset: "custom",
};

const presets: Record<Exclude<DesignPreset, "custom">, { colors: DesignColors; magic: MagicModeSettings }> = {
  softMagic: {
    colors: { hue: 328, saturation: 56, lightness: 62 },
    magic: { enabled: true, sparkleIntensity: 18, sparkleSize: "small", sparkleSpeed: "slow", sparkleDensity: 8, sparkleMode: "soft" as SparkleMode },
  },
  galaxy: {
    colors: { hue: 248, saturation: 78, lightness: 58 },
    magic: { enabled: true, sparkleIntensity: 28, sparkleSize: "small", sparkleSpeed: "slow", sparkleDensity: 11, sparkleMode: "sparkle" as SparkleMode },
  },
  elegant: {
    colors: { hue: 214, saturation: 20, lightness: 48 },
    magic: { enabled: false, sparkleIntensity: 0, sparkleSize: "small", sparkleSpeed: "slow", sparkleDensity: 6, sparkleMode: "soft" as SparkleMode },
  },
  neon: {
    colors: { hue: 168, saturation: 94, lightness: 52 },
    magic: { enabled: true, sparkleIntensity: 34, sparkleSize: "medium", sparkleSpeed: "medium", sparkleDensity: 14, sparkleMode: "sparkle" as SparkleMode },
  },
};

const DesignSystemContext = createContext<DesignSystemContextType | undefined>(undefined);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const wrapHue = (value: number) => ((Math.round(value) % 360) + 360) % 360;
const hsl = (hue: number, saturation: number, lightness: number) => `${wrapHue(hue)} ${clamp(saturation, 0, 100)}% ${clamp(lightness, 0, 100)}%`;

const readStoredState = (): DesignSystemState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultState;
    const parsed = JSON.parse(saved) as Partial<DesignSystemState>;

    return {
      colors: { ...defaultState.colors, ...parsed.colors },
      magic: { ...defaultState.magic, ...parsed.magic },
      preset: parsed.preset ?? defaultState.preset,
    };
  } catch {
    return defaultState;
  }
};

const createTheme = (colors: DesignColors, magic: MagicModeSettings, isDark: boolean): GlobalTheme => {
  const primaryHue = wrapHue(colors.hue);
  const primarySaturation = clamp(colors.saturation, 24, 100);
  const primaryLightness = clamp(colors.lightness, 28, 72);

  const secondaryHue = wrapHue(primaryHue + (isDark ? 42 : 30));
  const secondarySaturation = clamp(primarySaturation * (isDark ? 0.82 : 0.72), 18, 96);
  const secondaryLightness = clamp(primaryLightness + (isDark ? 6 : 10), isDark ? 42 : 34, isDark ? 72 : 80);

  const backgroundSaturation = clamp(primarySaturation * (isDark ? 0.4 : 0.3), isDark ? 14 : 8, isDark ? 34 : 28);
  const backgroundLightness = isDark
    ? clamp(7 + (100 - primaryLightness) * 0.04, 7, 13)
    : clamp(97 - primarySaturation * 0.05, 89, 97);

  const surfaceSaturation = clamp(backgroundSaturation + (isDark ? 4 : 2), isDark ? 14 : 8, isDark ? 30 : 20);
  const surfaceLightness = isDark
    ? clamp(backgroundLightness + 6, 13, 19)
    : clamp(backgroundLightness - 3, 84, 95);

  const surfaceMutedLightness = isDark
    ? clamp(surfaceLightness + 2, 15, 22)
    : clamp(surfaceLightness - 2, 80, 92);

  const borderLightness = isDark
    ? clamp(surfaceLightness + 7, 18, 28)
    : clamp(surfaceLightness - 8, 72, 88);

  const effectHue = wrapHue(primaryHue + 12);
  const effectSaturation = clamp(primarySaturation * 0.88, 24, 100);
  const effectLightness = clamp(primaryLightness + (isDark ? 10 : 6), isDark ? 46 : 34, isDark ? 80 : 86);

  const textPrimaryLightness = backgroundLightness > 58 ? 11 : 97;
  const textSecondaryLightness = backgroundLightness > 58 ? 34 : 76;
  const primaryForegroundLightness = primaryLightness > 62 ? 12 : 98;
  const secondaryForegroundLightness = secondaryLightness > 64 ? 12 : 98;
  const chatTheirsLightness = isDark
    ? clamp(surfaceLightness + 1, 15, 20)
    : clamp(surfaceLightness + 1, 86, 96);
  const sidebarBackgroundLightness = isDark
    ? clamp(backgroundLightness + 2, 9, 15)
    : clamp(backgroundLightness - 2, 88, 95);
  const sidebarAccentLightness = isDark
    ? clamp(surfaceLightness + 3, 18, 24)
    : clamp(surfaceLightness - 4, 78, 90);

  return {
    primaryColor: hsl(primaryHue, primarySaturation, primaryLightness),
    primaryForeground: hsl(primaryHue, 18, primaryForegroundLightness),
    secondaryColor: hsl(secondaryHue, secondarySaturation, secondaryLightness),
    secondaryForeground: hsl(secondaryHue, 18, secondaryForegroundLightness),
    backgroundColor: hsl(primaryHue, backgroundSaturation, backgroundLightness),
    surfaceColor: hsl(primaryHue, surfaceSaturation, surfaceLightness),
    surfaceMutedColor: hsl(primaryHue, clamp(backgroundSaturation * 0.9, 6, 24), surfaceMutedLightness),
    textPrimary: hsl(primaryHue, 18, textPrimaryLightness),
    textSecondary: hsl(primaryHue, 12, textSecondaryLightness),
    effectColor: hsl(effectHue, effectSaturation, effectLightness),
    borderColor: hsl(primaryHue, clamp(backgroundSaturation * 0.75, 6, 22), borderLightness),
    chatTheirsColor: hsl(primaryHue, surfaceSaturation, chatTheirsLightness),
    sidebarBackgroundColor: hsl(primaryHue, clamp(backgroundSaturation + 2, 8, 30), sidebarBackgroundLightness),
    sidebarAccentColor: hsl(primaryHue, clamp(surfaceSaturation, 8, 24), sidebarAccentLightness),
    sparkleIntensity: magic.sparkleIntensity,
    magicMode: magic.enabled,
  };
};

const applyThemeToRoot = (theme: GlobalTheme) => {
  const root = document.documentElement;
  const softGlow = theme.magicMode
    ? `0 18px 48px -24px hsl(${theme.effectColor} / 0.45), 0 10px 24px -18px hsl(${theme.primaryColor} / 0.28)`
    : `0 16px 40px -28px hsl(${theme.effectColor} / 0.24), 0 8px 22px -18px hsl(${theme.primaryColor} / 0.16)`;
  const strongGlow = theme.magicMode
    ? `0 24px 60px -28px hsl(${theme.effectColor} / 0.55), 0 12px 32px -18px hsl(${theme.primaryColor} / 0.32)`
    : `0 20px 48px -30px hsl(${theme.effectColor} / 0.28), 0 10px 26px -18px hsl(${theme.primaryColor} / 0.18)`;

  const cssVars: Record<string, string> = {
    "--primary": theme.primaryColor,
    "--primary-foreground": theme.primaryForeground,
    "--secondary": theme.surfaceMutedColor,
    "--secondary-foreground": theme.textPrimary,
    "--accent": theme.secondaryColor,
    "--accent-foreground": theme.secondaryForeground,
    "--background": theme.backgroundColor,
    "--foreground": theme.textPrimary,
    "--card": theme.surfaceColor,
    "--card-foreground": theme.textPrimary,
    "--popover": theme.surfaceColor,
    "--popover-foreground": theme.textPrimary,
    "--muted": theme.surfaceMutedColor,
    "--muted-foreground": theme.textSecondary,
    "--border": theme.borderColor,
    "--input": theme.borderColor,
    "--ring": theme.primaryColor,
    "--chat-mine": theme.primaryColor,
    "--chat-mine-foreground": theme.primaryForeground,
    "--chat-theirs": theme.chatTheirsColor,
    "--chat-theirs-foreground": theme.textPrimary,
    "--sidebar-background": theme.sidebarBackgroundColor,
    "--sidebar-foreground": theme.textPrimary,
    "--sidebar-primary": theme.primaryColor,
    "--sidebar-primary-foreground": theme.primaryForeground,
    "--sidebar-accent": theme.sidebarAccentColor,
    "--sidebar-accent-foreground": theme.textPrimary,
    "--sidebar-border": theme.borderColor,
    "--sidebar-ring": theme.effectColor,
    "--effect-color": theme.effectColor,
    "--theme-primary-gradient": `linear-gradient(135deg, hsl(${theme.primaryColor}), hsl(${theme.secondaryColor}))`,
    "--theme-accent-gradient": `linear-gradient(135deg, hsl(${theme.secondaryColor}), hsl(${theme.effectColor}))`,
    "--surface-glow": softGlow,
    "--surface-glow-strong": strongGlow,
  };

  Object.entries(cssVars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  root.dataset.magicMode = theme.magicMode ? "on" : "off";
};

export const useDesignSystem = () => {
  const context = useContext(DesignSystemContext);
  if (!context) {
    throw new Error("useDesignSystem must be used within DesignSystemProvider");
  }
  return context;
};

export const DesignSystemProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<DesignSystemState>(readStoredState);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const updateMode = () => setIsDark(document.documentElement.classList.contains("dark"));
    updateMode();

    const observer = new MutationObserver(updateMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  const theme = useMemo(() => createTheme(state.colors, state.magic, isDark), [state.colors, state.magic, isDark]);

  useLayoutEffect(() => {
    applyThemeToRoot(theme);
  }, [theme]);

  const setColors = useCallback((colors: Partial<DesignColors>) => {
    setState((previous) => ({
      ...previous,
      colors: { ...previous.colors, ...colors },
      preset: "custom",
    }));
  }, []);

  const setMagic = useCallback((magic: Partial<MagicModeSettings>) => {
    setState((previous) => ({
      ...previous,
      magic: { ...previous.magic, ...magic },
      preset: "custom",
    }));
  }, []);

  const applyPreset = useCallback((preset: DesignPreset) => {
    if (preset === "custom") {
      setState((previous) => ({ ...previous, preset: "custom" }));
      return;
    }

    setState({
      colors: { ...presets[preset].colors },
      magic: { ...presets[preset].magic },
      preset,
    });
  }, []);

  const value = useMemo<DesignSystemContextType>(
    () => ({
      state,
      theme,
      computedColors: theme,
      setColors,
      setMagic,
      applyPreset,
    }),
    [state, theme, setColors, setMagic, applyPreset],
  );

  return <DesignSystemContext.Provider value={value}>{children}</DesignSystemContext.Provider>;
};
