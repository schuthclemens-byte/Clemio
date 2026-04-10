import { Check, X } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

interface Props {
  password: string;
  visible: boolean;
}

const rules = (t: (k: string) => string) => [
  { key: "length", test: (p: string) => p.length >= 8, label: t("password.minLength") || "Mindestens 8 Zeichen" },
  { key: "upper", test: (p: string) => /[A-Z]/.test(p), label: t("password.uppercase") || "Ein Großbuchstabe" },
  { key: "lower", test: (p: string) => /[a-z]/.test(p), label: t("password.lowercase") || "Ein Kleinbuchstabe" },
  { key: "number", test: (p: string) => /\d/.test(p), label: t("password.number") || "Eine Zahl" },
  { key: "special", test: (p: string) => /[^A-Za-z0-9]/.test(p), label: t("password.special") || "Ein Sonderzeichen (!@#...)" },
];

export const isPasswordStrong = (password: string): boolean =>
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

const PasswordRequirements = ({ password, visible }: Props) => {
  const { t } = useI18n();

  if (!visible || !password) return null;

  const checks = rules(t);
  const passed = checks.filter((r) => r.test(password)).length;
  const pct = (passed / checks.length) * 100;

  return (
    <div className="p-3 rounded-xl bg-card border border-border animate-reveal-up space-y-2.5">
      {/* Strength bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            backgroundColor:
              pct <= 40 ? "hsl(var(--destructive))" : pct <= 80 ? "hsl(40 90% 50%)" : "hsl(142 70% 45%)",
          }}
        />
      </div>

      {/* Rule list */}
      <ul className="space-y-1">
        {checks.map((r) => {
          const ok = r.test(password);
          return (
            <li key={r.key} className="flex items-center gap-2 text-xs">
              {ok ? (
                <Check className="w-3.5 h-3.5 text-accent shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-destructive shrink-0" />
              )}
              <span className={ok ? "text-muted-foreground line-through" : "text-foreground"}>
                {r.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PasswordRequirements;
