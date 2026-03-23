import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, UserPlus, LogIn, Sparkles, Fingerprint, ChevronDown, Eye, EyeOff } from "lucide-react";
import { useI18n, localeNames, type Locale } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { isValidAuthPhone, sanitizePhoneInput } from "@/lib/authPhone";
import { toast } from "sonner";
import CountryCodePicker, { countries, findCountryByDial, detectCountryFromBrowser, type Country } from "@/components/auth/CountryCodePicker";

const getInitialCountry = (): Country => {
  const saved = localStorage.getItem("clevara_last_phone") || "";
  return findCountryByDial(saved) || detectCountryFromBrowser();
};

const getInitialLocalNumber = (): string => {
  const saved = localStorage.getItem("clevara_last_phone") || "";
  if (!saved) return "";
  const country = findCountryByDial(saved) || countries[0];
  // Strip the country dial code from saved number
  if (saved.startsWith(country.dial)) {
    return saved.slice(country.dial.length).trim();
  }
  return sanitizePhoneInput(saved);
};

const LoginPage = () => {
  const [country, setCountry] = useState<Country>(getInitialCountry);
  const [localNumber, setLocalNumber] = useState(() => getInitialLocalNumber());
  const phone = `${country.dial}${localNumber.replace(/\D/g, "")}`;
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
  const [showPassword, setShowPassword] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(true);

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
      localStorage.setItem("clevara_stay_logged_in", stayLoggedIn ? "true" : "false");
      navigate("/chats");
    } catch {
      toast.error("Biometrische Anmeldung fehlgeschlagen");
    } finally {
      setBiometricLoading(false);
    }
  }, [biometric, signIn, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const digits = localNumber.replace(/\D/g, "");
    if (digits.length < 4) {
      toast.error("Bitte gib eine gültige Handynummer ein");
      return;
    }

    const fullPhone = `${country.dial}${digits}`;
    if (!isValidAuthPhone(fullPhone)) {
      toast.error("Bitte gib eine gültige Handynummer ein");
      return;
    }

    if (password.length < 6) {
      toast.error("Das Passwort muss mindestens 6 Zeichen lang sein");
      return;
    }

    setLoading(true);
    const cleanPhone = fullPhone;
    localStorage.setItem("clevara_last_phone", cleanPhone);

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

      localStorage.setItem("clevara_stay_logged_in", "true");
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
        {/* Language Switcher */}
        <div className="absolute top-5 right-5">
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border text-sm text-foreground hover:bg-accent/10 transition-all duration-200 shadow-sm"
            >
              {localeNames[locale]}
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${langOpen ? "rotate-180" : ""}`} />
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-card border border-border rounded-xl shadow-elevated overflow-hidden animate-reveal-up z-50">
                {(Object.keys(localeNames) as Locale[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => { setLocale(l); setLangOpen(false); }}
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
        </div>

        <div className="w-full max-w-sm animate-reveal-up">
          {/* Logo & Header */}
          <div className="text-center mb-10">
            <div className="relative w-20 h-20 mx-auto mb-5">
              <img src="/icon-512.png" alt="Clevara" className="w-20 h-20 rounded-3xl shadow-soft" />
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

            <div className="flex">
              <CountryCodePicker selected={country} onSelect={setCountry} />
              <input
                type="tel"
                value={localNumber}
                onChange={(e) => setLocalNumber(e.target.value.replace(/[^\d\s]/g, ""))}
                placeholder="123 456 789"
                className="flex-1 h-14 rounded-r-2xl bg-card px-4 text-base shadow-sm border border-border border-l-0 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
                autoFocus
                aria-label={t("app.phonePlaceholder")}
                autoComplete={mode === "login" ? "username" : "tel"}
                name={mode === "login" ? "username" : "signup-phone"}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                data-form-type={mode === "login" ? "username" : "other"}
                inputMode="tel"
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                inputMode="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("app.passwordPlaceholder") || "Passwort (min. 6 Zeichen)"}
                className="w-full h-14 rounded-2xl bg-card px-5 pr-12 text-base shadow-sm border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
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
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {mode === "login" && (
              <button
                type="button"
                onClick={() => setStayLoggedIn(!stayLoggedIn)}
                className="flex items-center justify-between w-full px-1 py-1 cursor-pointer select-none group"
              >
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Eingeloggt bleiben</span>
                <div
                  className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
                    stayLoggedIn ? "gradient-primary" : "bg-border"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${
                      stayLoggedIn ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              </button>
            )}

            <button
              type="submit"
              disabled={localNumber.replace(/\D/g, "").length < 4 || password.length < 6 || loading}
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
                    disabled={localNumber.replace(/\D/g, "").length < 4 || forgotLoading}
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
              setLocalNumber(nextMode === "login" ? getInitialLocalNumber() : "");
              setCountry(nextMode === "login" ? getInitialCountry() : countries[0]);
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
