import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface AccessibilitySettings {
  dyslexiaFont: boolean;
  largeText: boolean;
  highContrast: boolean;
  autoRead: boolean;
  headphoneAutoPlay: boolean;
  focusMode: boolean;
  speechRate: number;
}

interface AccessibilityContextType extends AccessibilitySettings {
  toggle: (key: keyof Omit<AccessibilitySettings, "speechRate">) => void;
  setSpeechRate: (rate: number) => void;
}

const defaultSettings: AccessibilitySettings = {
  dyslexiaFont: false,
  largeText: false,
  highContrast: false,
  autoRead: false,
  headphoneAutoPlay: false,
  focusMode: false,
  speechRate: 1,
};

const AccessibilityContext = createContext<AccessibilityContextType>({
  ...defaultSettings,
  toggle: () => {},
  setSpeechRate: () => {},
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

      // Apply classes to document
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

  return (
    <AccessibilityContext.Provider value={{ ...settings, toggle, setSpeechRate }}>
      {children}
    </AccessibilityContext.Provider>
  );
};
