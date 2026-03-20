import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, ArrowRight } from "lucide-react";

const LoginPage = () => {
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim().length >= 6) {
      setStep("code");
    }
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length >= 4) {
      navigate("/chats");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm animate-reveal-up">
          {/* Logo area */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Phone className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-balance">
              Willkommen
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Melde dich mit deiner Handynummer an
            </p>
          </div>

          {step === "phone" ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+49 123 456 7890"
                  className="w-full h-14 rounded-2xl bg-card px-5 text-base shadow-sm border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={phone.trim().length < 6}
                className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
              >
                Weiter
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleCodeSubmit} className="space-y-4 animate-reveal-up">
              <p className="text-sm text-muted-foreground text-center">
                Code an <span className="font-medium text-foreground">{phone}</span> gesendet
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="• • • • • •"
                className="w-full h-14 rounded-2xl bg-card px-5 text-center text-xl tracking-[0.5em] font-semibold shadow-sm border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              <button
                type="submit"
                disabled={code.length < 4}
                className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
              >
                Anmelden
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Andere Nummer verwenden
              </button>
            </form>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground pb-6 px-6">
        Mit der Anmeldung akzeptierst du unsere Nutzungsbedingungen
      </p>
    </div>
  );
};

export default LoginPage;
