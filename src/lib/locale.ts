export const supportedLocales = ["de", "en", "es", "fr", "tr", "ar"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

const marketingPaths = new Set(["/", "/landing"]);

const LOCALE_STORAGE_KEYS = [
  "landing-locale",
  "app-locale",
] as const;

const MODE_STORAGE_KEYS = [
  "landing-locale-mode",
  "app-locale-mode",
] as const;

const normalizeLanguageTag = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  // Accept both BCP-47 ("de-DE") and underscore variants ("de_AT").
  const base = raw.toLowerCase().replace("_", "-").split("-")[0]?.trim();
  return base && base.length > 0 ? base : null;
};

const collectCandidates = (): string[] => {
  const sources: Array<string | null | undefined> = [];

  if (typeof navigator !== "undefined") {
    if (Array.isArray(navigator.languages)) {
      sources.push(...navigator.languages);
    }
    sources.push(navigator.language);
  }

  if (typeof document !== "undefined") {
    sources.push(document.documentElement.lang);
  }

  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const entry of sources) {
    const normalized = normalizeLanguageTag(entry);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      candidates.push(normalized);
    }
  }
  return candidates;
};

export const detectBrowserLocale = (): SupportedLocale => {
  const candidates = collectCandidates();

  // Priority 1: explicit German preference anywhere in the list.
  if (candidates.some((c) => c === "de")) return "de";
  // Priority 2: explicit English preference anywhere in the list.
  if (candidates.some((c) => c === "en")) return "en";
  // Priority 3: any other supported locale, in user-preference order.
  for (const candidate of candidates) {
    if ((supportedLocales as readonly string[]).includes(candidate)) {
      return candidate as SupportedLocale;
    }
  }
  // Fallback: app is German-first.
  return "de";
};

const isManualSelection = (modeKey: string): boolean => {
  try {
    return localStorage.getItem(modeKey) === "manual";
  } catch {
    return false;
  }
};

const readStoredLocale = (localeKey: string): SupportedLocale | null => {
  try {
    const saved = localStorage.getItem(localeKey);
    if (saved && (supportedLocales as readonly string[]).includes(saved)) {
      return saved as SupportedLocale;
    }
  } catch {
    // ignore
  }
  return null;
};

/**
 * Returns a stored locale ONLY when it was set manually by the user.
 * Old auto-detected values (mode != "manual") are ignored so a fresh
 * browser-language detection can take over.
 */
const getManualLocale = (localeKey: string, modeKey: string): SupportedLocale | null => {
  if (!isManualSelection(modeKey)) return null;
  return readStoredLocale(localeKey);
};

export const isMarketingPath = (pathname = window.location.pathname): boolean => {
  return marketingPaths.has(pathname);
};

export const detectInitialLocale = (pathname = window.location.pathname): SupportedLocale => {
  // 1. Manual user choice always wins.
  const manual = isMarketingPath(pathname)
    ? getManualLocale("landing-locale", "landing-locale-mode")
    : getManualLocale("app-locale", "app-locale-mode");
  if (manual) return manual;

  // 2. Otherwise always re-evaluate the browser/device language so a
  //    stale auto-saved value cannot block the current preference.
  return detectBrowserLocale();
};

export const persistSelectedLocale = (locale: SupportedLocale, pathname = window.location.pathname) => {
  try {
    localStorage.setItem("app-locale", locale);
    localStorage.setItem("app-locale-mode", "manual");

    if (isMarketingPath(pathname)) {
      localStorage.setItem("landing-locale", locale);
      localStorage.setItem("landing-locale-mode", "manual");
    }
  } catch {
    // ignore quota / privacy-mode errors
  }
};

/**
 * Clears any stored locale + mode markers so the next call to
 * detectInitialLocale falls back to fresh browser detection.
 * Useful for a "reset to system language" action.
 */
export const clearStoredLocale = () => {
  try {
    for (const key of LOCALE_STORAGE_KEYS) localStorage.removeItem(key);
    for (const key of MODE_STORAGE_KEYS) localStorage.removeItem(key);
  } catch {
    // ignore
  }
};
