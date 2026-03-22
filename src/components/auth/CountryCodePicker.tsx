import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export interface Country {
  code: string;
  name: string;
  dial: string;
  flag: string;
}

export const countries: Country[] = [
  { code: "DE", name: "Deutschland", dial: "+49", flag: "🇩🇪" },
  { code: "AT", name: "Österreich", dial: "+43", flag: "🇦🇹" },
  { code: "CH", name: "Schweiz", dial: "+41", flag: "🇨🇭" },
  { code: "US", name: "USA", dial: "+1", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { code: "ES", name: "España", dial: "+34", flag: "🇪🇸" },
  { code: "IT", name: "Italia", dial: "+39", flag: "🇮🇹" },
  { code: "NL", name: "Nederland", dial: "+31", flag: "🇳🇱" },
  { code: "BE", name: "Belgique", dial: "+32", flag: "🇧🇪" },
  { code: "PL", name: "Polska", dial: "+48", flag: "🇵🇱" },
  { code: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹" },
  { code: "SE", name: "Sverige", dial: "+46", flag: "🇸🇪" },
  { code: "NO", name: "Norge", dial: "+47", flag: "🇳🇴" },
  { code: "DK", name: "Danmark", dial: "+45", flag: "🇩🇰" },
  { code: "FI", name: "Suomi", dial: "+358", flag: "🇫🇮" },
  { code: "GR", name: "Ελλάδα", dial: "+30", flag: "🇬🇷" },
  { code: "CZ", name: "Česko", dial: "+420", flag: "🇨🇿" },
  { code: "RO", name: "România", dial: "+40", flag: "🇷🇴" },
  { code: "HU", name: "Magyarország", dial: "+36", flag: "🇭🇺" },
  { code: "TR", name: "Türkiye", dial: "+90", flag: "🇹🇷" },
  { code: "RU", name: "Россия", dial: "+7", flag: "🇷🇺" },
  { code: "UA", name: "Україна", dial: "+380", flag: "🇺🇦" },
  { code: "SA", name: "السعودية", dial: "+966", flag: "🇸🇦" },
  { code: "AE", name: "الإمارات", dial: "+971", flag: "🇦🇪" },
  { code: "EG", name: "مصر", dial: "+20", flag: "🇪🇬" },
  { code: "MA", name: "المغرب", dial: "+212", flag: "🇲🇦" },
  { code: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
  { code: "PK", name: "Pakistan", dial: "+92", flag: "🇵🇰" },
  { code: "CN", name: "中国", dial: "+86", flag: "🇨🇳" },
  { code: "JP", name: "日本", dial: "+81", flag: "🇯🇵" },
  { code: "KR", name: "한국", dial: "+82", flag: "🇰🇷" },
  { code: "BR", name: "Brasil", dial: "+55", flag: "🇧🇷" },
  { code: "MX", name: "México", dial: "+52", flag: "🇲🇽" },
  { code: "AR", name: "Argentina", dial: "+54", flag: "🇦🇷" },
  { code: "CO", name: "Colombia", dial: "+57", flag: "🇨🇴" },
  { code: "ZA", name: "South Africa", dial: "+27", flag: "🇿🇦" },
  { code: "NG", name: "Nigeria", dial: "+234", flag: "🇳🇬" },
  { code: "KE", name: "Kenya", dial: "+254", flag: "🇰🇪" },
  { code: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { code: "NZ", name: "New Zealand", dial: "+64", flag: "🇳🇿" },
  { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { code: "IL", name: "ישראל", dial: "+972", flag: "🇮🇱" },
  { code: "TH", name: "ไทย", dial: "+66", flag: "🇹🇭" },
  { code: "VN", name: "Việt Nam", dial: "+84", flag: "🇻🇳" },
  { code: "PH", name: "Philippines", dial: "+63", flag: "🇵🇭" },
  { code: "ID", name: "Indonesia", dial: "+62", flag: "🇮🇩" },
  { code: "MY", name: "Malaysia", dial: "+60", flag: "🇲🇾" },
  { code: "SG", name: "Singapore", dial: "+65", flag: "🇸🇬" },
];

export const findCountryByDial = (phone: string): Country | undefined => {
  if (!phone.startsWith("+")) return undefined;
  const sorted = [...countries].sort((a, b) => b.dial.length - a.dial.length);
  return sorted.find((c) => phone.startsWith(c.dial));
};

export const findCountryByCode = (code: string): Country | undefined => {
  return countries.find((c) => c.code.toLowerCase() === code.toLowerCase());
};

/** Detect country from browser language (e.g. "de-DE" → "DE", "en-US" → "US") */
export const detectCountryFromBrowser = (): Country => {
  const lang = navigator.language || (navigator as any).userLanguage || "de-DE";
  // Try region subtag first (e.g. "de-DE" → "DE")
  const parts = lang.split("-");
  if (parts.length >= 2) {
    const match = findCountryByCode(parts[1]);
    if (match) return match;
  }
  // Fallback: map language code to most common country
  const langToCountry: Record<string, string> = {
    de: "DE", en: "US", fr: "FR", es: "ES", it: "IT", pt: "PT", nl: "NL",
    tr: "TR", ar: "SA", ru: "RU", ja: "JP", ko: "KR", zh: "CN",
    pl: "PL", sv: "SE", da: "DK", fi: "FI", no: "NO", el: "GR",
    cs: "CZ", ro: "RO", hu: "HU", uk: "UA", hi: "IN", th: "TH",
    vi: "VN", id: "ID", ms: "MY", he: "IL",
  };
  const countryCode = langToCountry[parts[0].toLowerCase()];
  if (countryCode) {
    const match = findCountryByCode(countryCode);
    if (match) return match;
  }
  return countries[0]; // Default: Deutschland
};

interface CountryCodePickerProps {
  selected: Country;
  onSelect: (country: Country) => void;
}

const CountryCodePicker = ({ selected, onSelect }: CountryCodePickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [open]);

  const filtered = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dial.includes(search) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-3 h-14 rounded-l-2xl bg-card border border-border border-r-0 text-base hover:bg-accent/10 transition-colors duration-200 shrink-0"
      >
        <span className="text-lg">{selected.flag}</span>
        <span className="text-sm text-foreground font-medium">{selected.dial}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-72 max-h-72 bg-card border border-border rounded-xl shadow-elevated overflow-hidden z-50 animate-reveal-up">
          <div className="p-2 border-b border-border">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Land suchen..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="overflow-y-auto max-h-56">
            {filtered.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  onSelect(c);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150 ${
                  c.code === selected.code
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-accent/10"
                }`}
              >
                <span className="text-lg">{c.flag}</span>
                <span className="flex-1 text-left truncate">{c.name}</span>
                <span className="text-muted-foreground text-xs">{c.dial}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Kein Land gefunden</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CountryCodePicker;
