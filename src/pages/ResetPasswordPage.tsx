import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import PasswordRequirements, { isPasswordStrong } from "@/components/auth/PasswordRequirements";
import { toast } from "sonner";

const ResetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const { updatePassword } = useAuth();

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordStrong(password)) {
      toast.error("Das Passwort erfüllt nicht alle Anforderungen");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwörter stimmen nicht überein");
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);

    if (error) {
      toast.error("Fehler beim Zurücksetzen: " + error);
    } else {
      setSuccess(true);
      toast.success("Passwort erfolgreich geändert!");
      setTimeout(() => navigate("/chats"), 2000);
    }
  };

  if (!isRecovery && !success) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold mb-2">Ungültiger Link</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Dieser Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold"
          >
            Zurück zum Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-xl font-bold mb-2">Passwort geändert!</h1>
          <p className="text-muted-foreground text-sm">Du wirst weitergeleitet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate("/login")}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-lg">Neues Passwort</h1>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Neues Passwort festlegen</h2>
            <p className="text-muted-foreground text-sm mt-2">
              Wähle ein sicheres Passwort mit mindestens 6 Zeichen.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Neues Passwort"
              className="w-full h-14 rounded-2xl bg-card px-5 text-base shadow-sm border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              autoFocus
            />
            <PasswordRequirements password={password} visible={password.length > 0} />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Passwort bestätigen"
              className="w-full h-14 rounded-2xl bg-card px-5 text-base shadow-sm border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            />
            <button
              type="submit"
              disabled={!isPasswordStrong(password) || confirmPassword.length < 8 || loading}
              className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 shadow-soft disabled:opacity-40 disabled:pointer-events-none mt-1"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                "Passwort ändern"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
