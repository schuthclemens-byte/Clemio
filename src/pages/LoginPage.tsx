import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, UserPlus, LogIn, Sparkles, Fingerprint, ChevronDown } from "lucide-react";
import { useI18n, localeNames, type Locale } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { isValidAuthPhone, sanitizePhoneInput } from "@/lib/authPhone";
import { toast } from "sonner";

const LoginPage = () => {
  const [phone, setPhone] = useState(() => sanitizePhoneInput(localStorage.getItem("hearo_last_phone") || ""));
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [passwordFieldReady, setPasswordFieldReady] = useState(false);
  const navigate = useNavigate();
  const { t, locale, setLocale } = useI18n();
  const [langOpen, setLangOpen] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();
  const biometric = useBiometricAuth();
  const [showForgot, setShowForgot] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const handleBiometricLogin = useCallback(async () => {
    setBiometricLoading(true);
    try {
      const creds = await biometric.authenticateWithBiometric();
      if (!creds) {
        toast.error("Biometrische Anmeldung fehlgeschlagen");
        setBiometricLoading(false);
        return;
      }
      const { error } = await signIn(creds.phone, creds.password);
      if (error) {
        toast.error("Anmeldung fehlgeschlagen");
        setBiometricLoading(false);
        return;
      }
      localStorage.setItem("hearo_stay_logged_in", "true");
      navigate("/chats");
    } catch {
      toast.error("Biometrische Anmeldung fehlgeschlagen");
    } finally {
      setBiometricLoading(false);
    }
  }, [biometric, signIn, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPhone = sanitizePhoneInput(phone);
    if (!isValidAuthPhone(cleanPhone)) {
      toast.error("Bitte gib eine gültige Handynummer ein");
      return;
    }

    if (password.length < 6) {
      toast.error("Das Passwort muss mindestens 6 Zeichen lang sein");
      return;
    }

    setLoading(true);
    localStorage.setItem("hearo_last_phone", cleanPhone);

    try {
      if (mode === "login") {
        const { error } = await signIn(cleanPhone, password);
        if (error) {
          toast.error(t("app.loginError") || "Anmeldung fehlgeschlagen");
          return;
        }

        if (biometric.isAvailable) {
          if (!biometric.isEnabled) {
            try {
              const enrolled = await biometric.enableBiometric(cleanPhone, password);
              if (enrolled) {
                toast.success("Biometrische Anmeldung aktiviert! 🔐");
              }
            } catch {
              // ignore
            }
          } else {
            try {
              await biometric.enableBiometric(cleanPhone, password);
            } catch {
              // ignore
            }
          }
        }
      } else {
        const { error } = await signUp(cleanPhone, password, displayName || "Nutzer");
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
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-primary/5 animate-float" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-accent/5 animate-float" style={{ animationDelay: "3s" }} />
        <div className="absolute top-1/3 right-8 w-4 h-4 rounded-full bg-primary/20 animate-float" style={{ animationDelay: "1.5s" }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <div className="w-full max-w-sm animate-reveal-up">
          {/* Logo & Header */}
          <div className="text-center mb-10">
            <div className="relative w-20 h-20 mx-auto mb-5">
              <img src="/icon-512.png" alt="Hearo" className="w-20 h-20 rounded-3xl shadow-soft" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              {t("app.welcome")}
            </h1>
            <p className="text-muted-foreground mt-2.5 text-[0.938rem] leading-relaxed">
              {mode === "login"
                ? (t("app.loginSubtitle") || "Melde dich mit deiner Handynummer an")
                : (t("app.signupSubtitle") || "Erstelle ein neues Konto")}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off" noValidate>
            <div className="absolute opacity-0 pointer-events-none h-0 w-0 overflow-hidden" aria-hidden="true">
              <input type="text" name="username" autoComplete="username" tabIndex={-1} />
              <input type="password" name="current-password" autoComplete="current-password" tabIndex={-1} />
            </div>

            {mode === "signup" && (
              <div className="animate-reveal-up">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("app.displayNamePlaceholder") || "Dein Name"}
                  className="w-full h-14 rounded-2xl bg-card px-5 text-base shadow-sm border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
                  aria-label="Name"
                  autoComplete="name"
                  autoCapitalize="words"
                  data-1p-ignore
                  data-lpignore="true"
                />
              </div>
            )}

            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
              placeholder={t("app.phonePlaceholder") || "+49 123 456 789"}
              className="w-full h-14 rounded-2xl bg-card px-5 text-base shadow-sm border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
              autoFocus
              aria-label={t("app.phonePlaceholder")}
              autoComplete={mode === "login" ? "username" : "tel"}
              name={mode === "login" ? "username" : "signup-phone"}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              data-form-type={mode === "login" ? "username" : "other"}
              inputMode="tel"
              maxLength={16}
            />

            <input
              type="password"
              inputMode="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("app.passwordPlaceholder") || "Passwort (min. 6 Zeichen)"}
              className="w-full h-14 rounded-2xl bg-card px-5 text-base shadow-sm border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
              aria-label="Zugangscode"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              name="password"
              id={`_hro_field_${mode}`}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              readOnly={!passwordFieldReady}
              onFocus={() => setPasswordFieldReady(true)}
              onPointerDown={() => setPasswordFieldReady(true)}
              data-form-type={mode === "login" ? "password" : "new-password"}
            />

            <button
              type="submit"
              disabled={!isValidAuthPhone(phone) || password.length < 6 || loading}
              className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2.5 shadow-soft hover:shadow-elevated transition-all duration-300 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none mt-1"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : mode === "login" ? (
                <>
                  {t("app.login") || "Anmelden"}
                  <ArrowRight className="w-4.5 h-4.5" />
                </>
              ) : (
                <>
                  {t("app.signup") || "Registrieren"}
                  <UserPlus className="w-4.5 h-4.5" />
                </>
              )}
            </button>
          </form>

          {/* Biometric login button */}
          {mode === "login" && biometric.isAvailable && biometric.isEnabled && biometric.hasStoredCredential() && (
            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={biometricLoading}
              className="w-full h-14 rounded-2xl bg-card border-2 border-primary/20 text-foreground font-semibold text-base flex items-center justify-center gap-3 shadow-sm hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 active:scale-[0.97] disabled:opacity-40 mt-3"
            >
              {biometricLoading ? (
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <>
                  <Fingerprint className="w-5 h-5 text-primary" />
                  Mit Face ID / Fingerabdruck anmelden
                </>
              )}
            </button>
          )}

          {/* Forgot password */}
          {mode === "login" && !showForgot && (
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="w-full text-sm text-primary/70 hover:text-primary transition-colors duration-200 mt-3 text-center"
            >
              Passwort vergessen?
            </button>
          )}

          {showForgot && (
            <div className="mt-3 p-4 bg-card rounded-2xl border border-border animate-reveal-up">
              {forgotSent ? (
                <p className="text-sm text-accent text-center">
                  ✅ Falls ein Konto existiert, wurde ein Link gesendet.
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-3 text-center">
                    Gib deine Handynummer ein und tippe auf „Link senden".
                  </p>
                  <button
                    type="button"
                    disabled={!isValidAuthPhone(phone) || forgotLoading}
                    onClick={async () => {
                      setForgotLoading(true);
                      await resetPassword(phone);
                      setForgotLoading(false);
                      setForgotSent(true);
                    }}
                    className="w-full h-11 rounded-xl bg-primary/10 text-primary font-medium text-sm disabled:opacity-40"
                  >
                    {forgotLoading ? "Wird gesendet..." : "Link senden"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Toggle mode */}
          <button
            type="button"
            onClick={() => {
              const nextMode = mode === "login" ? "signup" : "login";
              setMode(nextMode);
              setPasswordFieldReady(false);
              setShowForgot(false);
              setForgotSent(false);
              setPassword("");
              setDisplayName("");
              setPhone(nextMode === "login" ? sanitizePhoneInput(localStorage.getItem("hearo_last_phone") || "") : "");
            }}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 mt-5 text-center"
          >
            {mode === "login"
              ? (t("app.noAccount") || "Noch kein Konto? Registrieren")
              : (t("app.hasAccount") || "Schon ein Konto? Anmelden")}
          </button>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground/60 pb-8 px-6 relative z-10">
        Mit der Anmeldung akzeptierst du unsere{" "}
        <button type="button" onClick={() => navigate("/terms")} className="underline hover:text-foreground transition-colors">
          Nutzungsbedingungen
        </button>{" "}
        und{" "}
        <button type="button" onClick={() => navigate("/privacy")} className="underline hover:text-foreground transition-colors">
          Datenschutzerklärung
        </button>
      </p>
    </div>
  );
};

export default LoginPage;
