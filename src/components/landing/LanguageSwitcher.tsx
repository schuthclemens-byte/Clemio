import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n, localeNames, type Locale } from "@/contexts/I18nContext";

// Short codes + flag emojis. Browsers (Chrome auto-translate) leave these alone,
// so the active language stays consistent with the page content.
const localeFlags: Record<Locale, string> = {
  de: "🇩🇪",
  en: "🇬🇧",
  es: "🇪🇸",
  fr: "🇫🇷",
  tr: "🇹🇷",
  ar: "🇸🇦",
};
const localeShort: Record<Locale, string> = {
  de: "DE",
  en: "EN",
  es: "ES",
  fr: "FR",
  tr: "TR",
  ar: "AR",
};

const LanguageSwitcher = () => {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative" translate="no">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Sprache wählen"
        aria-expanded={open}
        translate="no"
        className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-background/40 backdrop-blur-xl border border-border/40 text-sm font-medium text-foreground/90 hover:bg-background/60 hover:border-border/70 transition-all duration-300"
      >
        <span className="text-base leading-none" aria-hidden>
          {localeFlags[locale]}
        </span>
        <span className="tracking-wider">{localeShort[locale]}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-foreground/50 transition-transform duration-300 ${open ? "rotate-180" : ""}`} strokeWidth={2} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-background/80 backdrop-blur-2xl border border-border/40 rounded-2xl shadow-elevated overflow-hidden animate-reveal-up z-50 p-1" translate="no">
          {(Object.keys(localeNames) as Locale[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => { setLocale(l); setOpen(false); }}
              translate="no"
              className={`w-full flex items-center gap-3 text-left px-3.5 py-2.5 text-sm rounded-xl transition-colors duration-150 ${
                l === locale
                  ? "bg-foreground/10 text-foreground font-semibold"
                  : "text-foreground/80 hover:bg-foreground/5"
              }`}
            >
              <span className="text-base leading-none" aria-hidden>
                {localeFlags[l]}
              </span>
              <span>{localeNames[l]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
