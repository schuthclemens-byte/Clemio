import { useNavigate } from "react-router-dom";
import { Ear, Languages, Mic2, Shield, Headphones, ArrowRight, Download, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: <Ear className="w-6 h-6" />,
    title: "Nachrichten hören",
    description: "Lass dir Nachrichten vorlesen – in der echten Stimme deiner Kontakte.",
    gradient: "from-orange-400 to-rose-500",
  },
  {
    icon: <Mic2 className="w-6 h-6" />,
    title: "Stimme klonen",
    description: "Nimm deine Stimme auf und deine Freunde hören dich – nicht einen Roboter.",
    gradient: "from-rose-500 to-fuchsia-600",
  },
  {
    icon: <Languages className="w-6 h-6" />,
    title: "Echtzeit-Übersetzung",
    description: "Nachrichten werden automatisch in deine Sprache übersetzt.",
    gradient: "from-fuchsia-500 to-violet-600",
  },
  {
    icon: <Headphones className="w-6 h-6" />,
    title: "Kopfhörer-Modus",
    description: "Verbinde Kopfhörer und Nachrichten werden automatisch abgespielt.",
    gradient: "from-violet-500 to-blue-600",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Fokus-Modus",
    description: "Nur wichtige Kontakte werden vorgelesen. Keine Ablenkung.",
    gradient: "from-blue-500 to-cyan-500",
  },
];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Hero */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-gradient-to-br from-orange-400/20 to-rose-500/20 blur-3xl animate-float" />
          <div className="absolute top-1/3 -right-24 w-64 h-64 rounded-full bg-gradient-to-br from-fuchsia-500/15 to-violet-600/15 blur-3xl animate-float" style={{ animationDelay: "2s" }} />
          <div className="absolute -bottom-20 left-1/4 w-72 h-72 rounded-full bg-gradient-to-br from-blue-500/15 to-cyan-500/15 blur-3xl animate-float" style={{ animationDelay: "4s" }} />
        </div>

        <div className="relative z-10 max-w-lg mx-auto">
          {/* Logo */}
          <div className="w-20 h-20 rounded-[1.5rem] mx-auto mb-8 shadow-elevated overflow-hidden gradient-primary flex items-center justify-center">
            <MessageCircle className="w-10 h-10 text-primary-foreground" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Kostenlos verfügbar
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4 leading-[1.1]">
            Chat, der mit dir{" "}
            <span className="bg-gradient-to-r from-orange-400 via-rose-500 to-fuchsia-600 bg-clip-text text-transparent">
              spricht
            </span>
          </h1>

          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-sm mx-auto mb-10">
            Hearo liest dir Nachrichten vor – in der echten Stimme deiner Freunde. Überall, jederzeit.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={() => navigate("/install")}
              size="lg"
              className="rounded-full px-8 gap-2 text-base gradient-primary border-0 shadow-soft h-13"
            >
              <Download className="w-5 h-5" />
              App installieren
            </Button>
            <Button
              onClick={() => navigate("/login")}
              variant="outline"
              size="lg"
              className="rounded-full px-8 text-base h-13"
            >
              Anmelden
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/20 flex items-start justify-center pt-2">
            <div className="w-1 h-2 rounded-full bg-muted-foreground/40 animate-bounce" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-center mb-2 text-foreground">Was Hearo kann</h2>
        <p className="text-muted-foreground text-center text-sm mb-12">Alles, was du von einer Messaging-App erwartest – und mehr.</p>

        <div className="space-y-4">
          {features.map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border shadow-sm hover:shadow-elevated transition-shadow"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-white shrink-0`}>
                {f.icon}
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20">
        <div className="max-w-lg mx-auto rounded-3xl gradient-primary p-8 text-center shadow-soft">
          <h2 className="text-2xl font-bold text-primary-foreground mb-3">Bereit loszulegen?</h2>
          <p className="text-primary-foreground/80 text-sm mb-6 max-w-xs mx-auto">
            Installiere Hearo jetzt auf deinem Gerät – kostenlos, kein App Store nötig.
          </p>
          <Button
            onClick={() => navigate("/install")}
            variant="secondary"
            size="lg"
            className="rounded-full px-8 gap-2 text-base font-semibold"
          >
            <Download className="w-5 h-5" />
            Jetzt installieren
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6 text-center">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Hearo · Alle Rechte vorbehalten</p>
      </footer>
    </div>
  );
};

export default LandingPage;
