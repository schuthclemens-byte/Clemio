import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface AccessibilitySettings {
  dyslexiaFont: boolean;
  largeText: boolean;
  highContrast: boolean;
  autoRead: boolean;
  headphoneAutoPlay: boolean;
  focusMode: boolean;
  speechRate: number;
  smartSilence: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string;   // "07:00"
  compactMode: boolean;
  muteSounds: boolean;
}

interface AccessibilityContextType extends AccessibilitySettings {
  toggle: (key: keyof Omit<AccessibilitySettings, "speechRate" | "quietHoursStart" | "quietHoursEnd">) => void;
  setSpeechRate: (rate: number) => void;
  setQuietHours: (start: string, end: string) => void;
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
};

const AccessibilityContext = createContext<AccessibilityContextType>({
  ...defaultSettings,
  toggle: () => {},
  setSpeechRate: () => {},
  setQuietHours: () => {},
  isQuietTime: () => false,
});

export const useAccessibility = () => useContext(AccessibilityContext);

export const AccessibilityProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    try {
      const saved = localStorage.getItem("a11y-settings");
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const toggle = useCallback((key: keyof AccessibilitySettings) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("a11y-settings", JSON.stringify(next));

      const root = document.documentElement;
      if (key === "dyslexiaFont") root.classList.toggle("dyslexia-font", next.dyslexiaFont);
      if (key === "largeText") root.classList.toggle("large-text", next.largeText);
      if (key === "highContrast") root.classList.toggle("high-contrast", next.highContrast);

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
    // Overnight (e.g. 22:00 - 07:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }, [settings.smartSilence, settings.quietHoursStart, settings.quietHoursEnd]);

  return (
    <AccessibilityContext.Provider value={{ ...settings, toggle, setSpeechRate, setQuietHours, isQuietTime }}>
      {children}
    </AccessibilityContext.Provider>
  );
};