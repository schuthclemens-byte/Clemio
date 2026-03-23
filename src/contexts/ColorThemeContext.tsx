import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ColorTheme = "sunset" | "ocean" | "forest" | "lavender" | "neon" | "rose" | "midnight";

interface ColorThemeContextType {
  colorTheme: ColorTheme;
  setColorTheme: (t: ColorTheme) => void;
}

const ColorThemeContext = createContext<ColorThemeContextType | undefined>(undefined);

export const useColorTheme = () => {
  const ctx = useContext(ColorThemeContext);
  if (!ctx) throw new Error("useColorTheme must be used within ColorThemeProvider");
  return ctx;
};

export const colorThemeLabels: Record<ColorTheme, string> = {
  sunset: "Sunset",
  ocean: "Ozean",
  forest: "Wald",
  lavender: "Lavendel",
  neon: "Neon",
  rose: "Rosé",
  midnight: "Midnight",
};

export const colorThemePreview: Record<ColorTheme, string[]> = {
  sunset: ["hsl(18,90%,55%)", "hsl(340,75%,55%)", "hsl(45,90%,60%)"],
  ocean: ["hsl(200,85%,50%)", "hsl(220,70%,55%)", "hsl(180,60%,45%)"],
  forest: ["hsl(150,60%,40%)", "hsl(130,50%,35%)", "hsl(80,55%,50%)"],
  lavender: ["hsl(270,60%,60%)", "hsl(290,50%,55%)", "hsl(250,55%,65%)"],
  neon: ["hsl(160,100%,45%)", "hsl(280,100%,60%)", "hsl(50,100%,55%)"],
  rose: ["hsl(350,70%,58%)", "hsl(330,60%,50%)", "hsl(10,70%,60%)"],
  midnight: ["hsl(230,60%,50%)", "hsl(250,50%,45%)", "hsl(210,70%,55%)"],
};

// Each theme defines overrides for key CSS variables (light mode values)
// Dark mode adjustments are applied automatically
const themes: Record<ColorTheme, { light: Record<string, string>; dark: Record<string, string> }> = {
  sunset: {
    light: {
      "--primary": "18 90% 55%",
      "--accent": "340 75% 55%",
      "--ring": "18 90% 55%",
      "--chat-mine": "18 90% 55%",
      "--sidebar-ring": "18 90% 55%",
    },
    dark: {
      "--primary": "18 90% 55%",
      "--accent": "340 75% 55%",
      "--ring": "18 90% 55%",
      "--chat-mine": "18 85% 50%",
      "--sidebar-ring": "18 90% 55%",
    },
  },
  ocean: {
    light: {
      "--primary": "200 85% 50%",
      "--accent": "220 70% 55%",
      "--ring": "200 85% 50%",
      "--chat-mine": "200 85% 50%",
      "--sidebar-ring": "200 85% 50%",
    },
    dark: {
      "--primary": "200 85% 50%",
      "--accent": "220 70% 55%",
      "--ring": "200 85% 50%",
      "--chat-mine": "200 80% 45%",
      "--sidebar-ring": "200 85% 50%",
    },
  },
  forest: {
    light: {
      "--primary": "150 60% 40%",
      "--accent": "80 55% 50%",
      "--ring": "150 60% 40%",
      "--chat-mine": "150 60% 40%",
      "--sidebar-ring": "150 60% 40%",
    },
    dark: {
      "--primary": "150 60% 42%",
      "--accent": "80 55% 50%",
      "--ring": "150 60% 42%",
      "--chat-mine": "150 55% 38%",
      "--sidebar-ring": "150 60% 42%",
    },
  },
  lavender: {
    light: {
      "--primary": "270 60% 60%",
      "--accent": "290 50% 55%",
      "--ring": "270 60% 60%",
      "--chat-mine": "270 60% 60%",
      "--sidebar-ring": "270 60% 60%",
    },
    dark: {
      "--primary": "270 60% 58%",
      "--accent": "290 50% 55%",
      "--ring": "270 60% 58%",
      "--chat-mine": "270 55% 52%",
      "--sidebar-ring": "270 60% 58%",
    },
  },
  neon: {
    light: {
      "--primary": "160 100% 40%",
      "--accent": "280 100% 60%",
      "--ring": "160 100% 40%",
      "--chat-mine": "160 100% 40%",
      "--sidebar-ring": "160 100% 40%",
    },
    dark: {
      "--primary": "160 100% 45%",
      "--accent": "280 100% 60%",
      "--ring": "160 100% 45%",
      "--chat-mine": "160 90% 38%",
      "--sidebar-ring": "160 100% 45%",
    },
  },
  rose: {
    light: {
      "--primary": "350 70% 58%",
      "--accent": "330 60% 50%",
      "--ring": "350 70% 58%",
      "--chat-mine": "350 70% 58%",
      "--sidebar-ring": "350 70% 58%",
    },
    dark: {
      "--primary": "350 70% 55%",
      "--accent": "330 60% 50%",
      "--ring": "350 70% 55%",
      "--chat-mine": "350 65% 50%",
      "--sidebar-ring": "350 70% 55%",
    },
  },
  midnight: {
    light: {
      "--primary": "230 60% 50%",
      "--accent": "210 70% 55%",
      "--ring": "230 60% 50%",
      "--chat-mine": "230 60% 50%",
      "--sidebar-ring": "230 60% 50%",
    },
    dark: {
      "--primary": "230 60% 52%",
      "--accent": "210 70% 55%",
      "--ring": "230 60% 52%",
      "--chat-mine": "230 55% 45%",
      "--sidebar-ring": "230 60% 52%",
    },
  },
};

export const ColorThemeProvider = ({ children }: { children: ReactNode }) => {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    return (localStorage.getItem("voxa-color-theme") as ColorTheme) || "sunset";
  });

  const setColorTheme = (t: ColorTheme) => {
    setColorThemeState(t);
    localStorage.setItem("voxa-color-theme", t);
  };

  useEffect(() => {
    const root = document.documentElement;
    const isDark = root.classList.contains("dark");
    const vars = isDark ? themes[colorTheme].dark : themes[colorTheme].light;

    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    return () => {
      Object.keys(vars).forEach((key) => {
        root.style.removeProperty(key);
      });
    };
  }, [colorTheme]);

  // Re-apply when dark/light mode changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      const vars = isDark ? themes[colorTheme].dark : themes[colorTheme].light;
      Object.entries(vars).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
      });
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [colorTheme]);

  return (
    <ColorThemeContext.Provider value={{ colorTheme, setColorTheme }}>
      {children}
    </ColorThemeContext.Provider>
  );
};
