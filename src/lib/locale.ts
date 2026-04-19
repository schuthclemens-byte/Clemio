export const supportedLocales = ["de", "en", "es", "fr", "tr", "ar"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

const marketingPaths = new Set(["/", "/landing"]);

export const detectBrowserLocale = (): SupportedLocale => {
  const candidates = (navigator.languages && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language || "de"]
  ).map((lang) => lang.toLowerCase().split("-")[0]);

  for (const candidate of candidates) {
    if (supportedLocales.includes(candidate as SupportedLocale)) {
      return candidate as SupportedLocale;
    }
  }

  return "de";
};

const getStoredLocale = (localeKey: string, modeKey: string): SupportedLocale | null => {
  const saved = localStorage.getItem(localeKey);
  const savedMode = localStorage.getItem(modeKey);

  if (savedMode === "manual" && saved && supportedLocales.includes(saved as SupportedLocale)) {
    return saved as SupportedLocale;
  }

  return null;
};

export const isMarketingPath = (pathname = window.location.pathname): boolean => {
  return marketingPaths.has(pathname);
};

export const detectInitialLocale = (pathname = window.location.pathname): SupportedLocale => {
  if (isMarketingPath(pathname)) {
    return getStoredLocale("landing-locale", "landing-locale-mode") ?? detectBrowserLocale();
  }

  return getStoredLocale("app-locale", "app-locale-mode") ?? detectBrowserLocale();
};

export const persistSelectedLocale = (locale: SupportedLocale, pathname = window.location.pathname) => {
  localStorage.setItem("app-locale", locale);
  localStorage.setItem("app-locale-mode", "manual");

  if (isMarketingPath(pathname)) {
    localStorage.setItem("landing-locale", locale);
    localStorage.setItem("landing-locale-mode", "manual");
  }
};
