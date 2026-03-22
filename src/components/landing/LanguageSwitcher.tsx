import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n, localeNames, type Locale } from "@/contexts/I18nContext";

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
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground hover:bg-accent/10 transition-all duration-200 shadow-sm"
      >
        {localeNames[locale]}
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-40 bg-card border border-border rounded-xl shadow-elevated overflow-hidden animate-reveal-up z-50">
          {(Object.keys(localeNames) as Locale[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => { setLocale(l); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 ${
                l === locale ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-accent/10"
              }`}
            >
              {localeNames[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
