import { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from "react";

export type FontScope = "app" | "chat";
export type FontFamily = "system" | "inter" | "atkinson" | "opendyslexic" | "serif" | "mono";

interface AccessibilitySettings {
  dyslexiaFont: boolean;
  largeText: boolean;
  highContrast: boolean;
  autoRead: boolean;
  headphoneAutoPlay: boolean;
  focusMode: boolean;
  speechRate: number;
  smartSilence: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  compactMode: boolean;
  muteSounds: boolean;
  autoCorrect: boolean;
  showOnlineStatus: boolean;
  showTypingIndicator: boolean;
  fontScope: FontScope;
  fontFamily: FontFamily;
}

interface AccessibilityContextType extends AccessibilitySettings {
  toggle: (key: keyof Omit<AccessibilitySettings, "speechRate" | "quietHoursStart" | "quietHoursEnd" | "fontScope" | "fontFamily">) => void;
  setSpeechRate: (rate: number) => void;
  setQuietHours: (start: string, end: string) => void;
  setFontScope: (scope: FontScope) => void;
  setFontFamily: (family: FontFamily) => void;
  isQuietTime: () => boolean;
}

const defaultSettings: AccessibilitySettings = {
  dyslexiaFont: false,
  largeText: false,
  highContrast: false,
  autoRead: false,
  headphoneAutoPlay: false,
  focusMode: false,
  speechRate: 1,
  smartSilence: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  compactMode: false,
  muteSounds: false,
  autoCorrect: true,
  showOnlineStatus: true,
  showTypingIndicator: true,
  fontScope: "app",
  fontFamily: "system",
};

const AccessibilityContext = createContext<AccessibilityContextType>({
  ...defaultSettings,
  toggle: () => {},
  setSpeechRate: () => {},
  setQuietHours: () => {},
  setFontScope: () => {},
  setFontFamily: () => {},
  isQuietTime: () => false,
});

export const useAccessibility = () => useContext(AccessibilityContext);

const FONT_CLASSES: Record<FontFamily, string> = {
  system: "",
  inter: "font-inter",
  atkinson: "font-atkinson",
  opendyslexic: "font-opendyslexic",
  serif: "font-serif-app",
  mono: "font-mono-app",
};

const ALL_FONT_CLASSES = Object.values(FONT_CLASSES).filter(Boolean);

const GOOGLE_FONT_HREFS: Partial<Record<FontFamily, string>> = {
  inter: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  atkinson: "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&display=swap",
  opendyslexic: "https://fonts.cdnfonts.com/css/opendyslexic",
};

const ensureFontLoaded = (family: FontFamily) => {
  const href = GOOGLE_FONT_HREFS[family];
  if (!href) return;
  const id = `font-${family}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
};

const applyFontClasses = (root: HTMLElement, family: FontFamily, scope: FontScope) => {
  ALL_FONT_CLASSES.forEach((c) => root.classList.remove(c));
  root.classList.remove("font-scope-chat");
  if (family !== "system") {
    const cls = FONT_CLASSES[family];
    if (cls) root.classList.add(cls);
    if (scope === "chat") root.classList.add("font-scope-chat");
  }
};

const applyDyslexiaScope = (root: HTMLElement, on: boolean, scope: FontScope) => {
  root.classList.toggle("dyslexia-font", on && scope === "app");
  root.classList.toggle("dyslexia-font-chat-only", on && scope === "chat");
};

export const AccessibilityProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    try {
      const saved = localStorage.getItem("a11y-settings");
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  // Apply font + dyslexia classes whenever scope/family/dyslexia changes
  useEffect(() => {
    const root = document.documentElement;
    if (settings.fontFamily !== "system") ensureFontLoaded(settings.fontFamily);
    applyFontClasses(root, settings.fontFamily, settings.fontScope);
    applyDyslexiaScope(root, settings.dyslexiaFont, settings.fontScope);
  }, [settings.fontFamily, settings.fontScope, settings.dyslexiaFont]);

  const toggle = useCallback((key: keyof AccessibilitySettings) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("a11y-settings", JSON.stringify(next));

      const root = document.documentElement;
      if (key === "largeText") root.classList.toggle("large-text", next.largeText as boolean);
      if (key === "highContrast") root.classList.toggle("high-contrast", next.highContrast as boolean);
      // dyslexiaFont handled by useEffect (depends on fontScope)

      return next;
    });
  }, []);

  const setSpeechRate = useCallback((rate: number) => {
    setSettings((prev) => {
      const next = { ...prev, speechRate: rate };
      localStorage.setItem("a11y-settings", JSON.stringify(next));
      return next;
    });
  }, []);

  const setQuietHours = useCallback((start: string, end: string) => {
    setSettings((prev) => {
      const next = { ...prev, quietHoursStart: start, quietHoursEnd: end };
      localStorage.setItem("a11y-settings", JSON.stringify(next));
      return next;
    });
  }, []);

  const setFontScope = useCallback((scope: FontScope) => {
    setSettings((prev) => {
      const next = { ...prev, fontScope: scope };
      localStorage.setItem("a11y-settings", JSON.stringify(next));
      return next;
    });
  }, []);

  const setFontFamily = useCallback((family: FontFamily) => {
    setSettings((prev) => {
      const next = { ...prev, fontFamily: family };
      localStorage.setItem("a11y-settings", JSON.stringify(next));
      return next;
    });
  }, []);

  const isQuietTime = useCallback(() => {
    if (!settings.smartSilence) return false;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [sh, sm] = settings.quietHoursStart.split(":").map(Number);
    const [eh, em] = settings.quietHoursEnd.split(":").map(Number);
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }, [settings.smartSilence, settings.quietHoursStart, settings.quietHoursEnd]);

  const value = useMemo(() => ({
    ...settings, toggle, setSpeechRate, setQuietHours, setFontScope, setFontFamily, isQuietTime
  }), [settings, toggle, setSpeechRate, setQuietHours, setFontScope, setFontFamily, isQuietTime]);

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};
