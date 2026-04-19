export const supportedLocales = ["de", "en", "es", "fr", "tr", "ar"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

const marketingPaths = new Set(["/", "/landing"]);

export const detectBrowserLocale = (): SupportedLocale => {
  // navigator.languages reflects the user's preferred reading languages in
  // priority order (the order shown in chrome://settings/languages). The
  // single navigator.language often only mirrors the browser UI language and
  // can therefore be misleading (e.g. English UI but German content
  // preference). We honour the explicit preference list first and only fall
  // back to navigator.language if nothing else matches.
  const preferred = navigator.languages && navigator.languages.length > 0
    ? Array.from(navigator.languages)
    : [];
  const fallback = navigator.language ? [navigator.language] : ["de"];

  const candidates = [...preferred, ...fallback]
    .map((lang) => lang.toLowerCase().split("-")[0])
    .filter((lang, index, values) => values.indexOf(lang) === index);

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
