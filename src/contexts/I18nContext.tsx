import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, ReactNode } from "react";
import de from "@/i18n/de";
import en from "@/i18n/en";
import { detectInitialLocale, persistSelectedLocale, type SupportedLocale } from "@/lib/locale";

export type Locale = SupportedLocale;

export const localeNames: Record<Locale, string> = {
  de: "Deutsch",
  en: "English",
  es: "Español",
  fr: "Français",
  tr: "Türkçe",
  ar: "العربية",
};

export const localeSpeechCodes: Record<Locale, string> = {
  de: "de-DE",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  tr: "tr-TR",
  ar: "ar-SA",
};

const loaders: Record<Locale, () => Promise<{ default: Record<string, string> }>> = {
  de: () => Promise.resolve({ default: de }),
  en: () => import("@/i18n/en"),
  es: () => import("@/i18n/es"),
  fr: () => import("@/i18n/fr"),
  tr: () => import("@/i18n/tr"),
  ar: () => import("@/i18n/ar"),
};

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  syncLocaleForPath: (pathname?: string) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "de",
  setLocale: () => {},
  syncLocaleForPath: () => {},
  t: (key) => key,
});

export const useI18n = () => useContext(I18nContext);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(() => detectInitialLocale());

  const [strings, setStrings] = useState<Record<string, string>>(de);
  const [ready, setReady] = useState(locale === "de");
  const loadedRef = useRef<Locale>("de");

  useEffect(() => {
    if (locale !== "de") {
      loaders[locale]().then((mod) => {
        setStrings(mod.default);
        loadedRef.current = locale;
        setReady(true);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (locale === loadedRef.current) return;
    loaders[locale]().then((mod) => {
      setStrings(mod.default);
      loadedRef.current = locale;
    });
  }, [locale]);

  useEffect(() => {
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    persistSelectedLocale(l);
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = l;
    document.documentElement.dataset.localeApplied = "true";
  }, []);

  const syncLocaleForPath = useCallback((pathname = window.location.pathname) => {
    const nextLocale = detectInitialLocale(pathname);
    setLocaleState((current) => (current === nextLocale ? current : nextLocale));
    document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = nextLocale;
    document.documentElement.dataset.localeApplied = "true";
  }, []);

  const t = useCallback(
    (key: string) => strings[key] || en[key] || de[key] || key,
    [strings]
  );

  const value = useMemo(() => ({ locale, setLocale, syncLocaleForPath, t }), [locale, setLocale, syncLocaleForPath, t]);

  if (!ready) return null;

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};
