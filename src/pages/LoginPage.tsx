import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, ArrowRight, UserPlus, LogIn } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const LoginPage = () => {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useI18n();
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim().length < 6 || password.length < 6) return;

    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await signIn(phone, password);
        if (error) {
          toast.error(t("app.loginError") || "Anmeldung fehlgeschlagen");
          return;
        }
      } else {
        const { error } = await signUp(phone, password, displayName || "Nutzer");
        if (error) {
          toast.error(error);
          return;
        }
        toast.success(t("app.signupSuccess") || "Konto erstellt!");
      }
      navigate("/chats");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm animate-reveal-up">
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Phone className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-balance">
              {t("app.welcome")}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {mode === "login"
                ? (t("app.loginSubtitle") || "Melde dich mit deiner Handynummer an")
                : (t("app.signupSubtitle") || "Erstelle ein neues Konto")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("app.displayNamePlaceholder") || "Dein Name"}
                className="w-full h-14 rounded-2xl bg-card px-5 text-base shadow-sm border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Name"
              />
            )}

            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("app.phonePlaceholder") || "+49 123 456 789"}
              className="w-full h-14 rounded-2xl bg-card px-5 text-base shadow-sm border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
              aria-label={t("app.phonePlaceholder")}
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("app.passwordPlaceholder") || "Passwort (min. 6 Zeichen)"}
              className="w-full h-14 rounded-2xl bg-card px-5 text-base shadow-sm border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Passwort"
            />

            <button
              type="submit"
              disabled={phone.trim().length < 6 || password.length < 6 || loading}
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : mode === "login" ? (
                <>
                  {t("app.login") || "Anmelden"}
                  <LogIn className="w-4 h-4" />
                </>
              ) : (
                <>
                  {t("app.signup") || "Registrieren"}
                  <UserPlus className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors mt-4 text-center"
          >
            {mode === "login"
              ? (t("app.noAccount") || "Noch kein Konto? Registrieren")
              : (t("app.hasAccount") || "Schon ein Konto? Anmelden")}
          </button>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground pb-6 px-6">
        {t("app.terms")}
      </p>
    </div>
  );
};

export default LoginPage;
