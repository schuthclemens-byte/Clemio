import { useNavigate } from "react-router-dom";
import { Ear, Languages, Mic2, Shield, Headphones, ArrowRight, Download, MessageCircle, Sparkles, Play, Pause, ShieldCheck, Heart, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";

const features = [
  {
    icon: <Ear className="w-6 h-6" />,
    title: "Nachrichten hören",
    description: "Lehn dich zurück – deine Nachrichten werden dir vorgelesen, als würde dein Freund neben dir sitzen.",
    gradient: "from-orange-400 to-rose-500",
  },
  {
    icon: <Mic2 className="w-6 h-6" />,
    title: "Stimme klonen",
    description: "Deine Stimme, nicht ein Roboter. Deine Freunde hören dich – auch wenn du tippst.",
    gradient: "from-rose-500 to-fuchsia-600",
  },
  {
    icon: <Languages className="w-6 h-6" />,
    title: "Echtzeit-Übersetzung",
    description: "Sprich jede Sprache. Nachrichten werden automatisch übersetzt – du merkst es kaum.",
    gradient: "from-fuchsia-500 to-violet-600",
  },
  {
    icon: <Headphones className="w-6 h-6" />,
    title: "Kopfhörer drin? Läuft.",
    description: "Sobald du Kopfhörer einsteckst, werden neue Nachrichten automatisch abgespielt.",
    gradient: "from-violet-500 to-blue-600",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Fokus-Modus",
    description: "Nur wer dir wichtig ist, wird vorgelesen. Der Rest wartet.",
    gradient: "from-blue-500 to-cyan-500",
  },
];

const trustPoints = [
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    text: "Stimmen werden nur mit ausdrücklicher Zustimmung verwendet",
  },
  {
    icon: <Lock className="w-5 h-5" />,
    text: "Du kannst deine Stimme jederzeit löschen",
  },
  {
    icon: <Heart className="w-5 h-5" />,
    text: "Deine Daten gehören dir – immer",
  },
];

const DEMO_TEXT = "Hey! Schön, dass du da bist. So klingt es, wenn dir jemand eine Nachricht schickt. Ganz natürlich, wie ein echtes Gespräch.";

const LandingPage = () => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const playDemo = useCallback(() => {
    if (!("speechSynthesis" in window)) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(DEMO_TEXT);
    utterance.lang = "de-DE";
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isPlaying]);

  const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
    }),
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-gradient-to-br from-orange-400/20 to-rose-500/20 blur-3xl animate-float" />
          <div className="absolute top-1/3 -right-24 w-64 h-64 rounded-full bg-gradient-to-br from-fuchsia-500/15 to-violet-600/15 blur-3xl animate-float" style={{ animationDelay: "2s" }} />
          <div className="absolute -bottom-20 left-1/4 w-72 h-72 rounded-full bg-gradient-to-br from-blue-500/15 to-cyan-500/15 blur-3xl animate-float" style={{ animationDelay: "4s" }} />
        </div>

        <motion.div
          className="relative z-10 max-w-lg mx-auto"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.12 } },
          }}
        >
          {/* Logo */}
          <motion.div
            variants={fadeUp}
            custom={0}
            className="w-20 h-20 rounded-[1.5rem] mx-auto mb-8 shadow-elevated overflow-hidden gradient-primary flex items-center justify-center"
          >
            <MessageCircle className="w-10 h-10 text-primary-foreground" />
          </motion.div>

          <motion.div variants={fadeUp} custom={1} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Kostenlos verfügbar
          </motion.div>

          <motion.h1 variants={fadeUp} custom={2} className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4 leading-[1.1]">
            Chat, der mit dir{" "}
            <span className="bg-gradient-to-r from-orange-400 via-rose-500 to-fuchsia-600 bg-clip-text text-transparent">
              spricht
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} custom={3} className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-sm mx-auto mb-8">
            Hearo liest dir Nachrichten vor – in der echten Stimme deiner Freunde. Überall, jederzeit.
          </motion.p>

          {/* Demo Button – WOW Moment */}
          <motion.div variants={fadeUp} custom={4} className="mb-10">
            <button
              onClick={playDemo}
              className="group relative inline-flex items-center gap-3 px-6 py-3.5 rounded-full bg-card border border-border shadow-soft hover:shadow-elevated transition-all duration-300"
            >
              <span className={`w-11 h-11 rounded-full gradient-primary flex items-center justify-center shrink-0 transition-transform duration-300 ${isPlaying ? "scale-95" : "group-hover:scale-110"}`}>
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-primary-foreground" />
                ) : (
                  <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                )}
              </span>
              <span className="text-left">
                <span className="block text-sm font-semibold text-foreground">
                  {isPlaying ? "Max spricht…" : "Hör eine Beispielnachricht"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {isPlaying ? "Tippe zum Stoppen" : "Erlebe den Unterschied"}
                </span>
              </span>
              {isPlaying && (
                <span className="flex items-center gap-0.5 ml-1">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className="w-0.5 bg-primary rounded-full animate-pulse"
                      style={{
                        height: `${12 + Math.random() * 10}px`,
                        animationDelay: `${i * 0.15}s`,
                        animationDuration: "0.6s",
                      }}
                    />
                  ))}
                </span>
              )}
            </button>
          </motion.div>

          <motion.div variants={fadeUp} custom={5} className="flex flex-col sm:flex-row items-center justify-center gap-3">
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
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/20 flex items-start justify-center pt-2">
            <div className="w-1 h-2 rounded-full bg-muted-foreground/40 animate-bounce" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 max-w-lg mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          <motion.h2 variants={fadeUp} custom={0} className="text-2xl font-bold text-center mb-2 text-foreground">
            Was Hearo kann
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground text-center text-sm mb-12">
            Alles, was du brauchst – nichts, was dich ablenkt.
          </motion.p>

          <div className="space-y-4">
            {features.map((f, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i + 2}
                className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border shadow-sm hover:shadow-elevated transition-shadow"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-white shrink-0`}>
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Trust Section */}
      <section className="px-6 py-16">
        <motion.div
          className="max-w-lg mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          <motion.h2 variants={fadeUp} custom={0} className="text-2xl font-bold text-center mb-2 text-foreground">
            Deine Stimme, deine Kontrolle
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground text-center text-sm mb-10">
            Vertrauen ist uns wichtiger als jedes Feature.
          </motion.p>

          <div className="space-y-3">
            {trustPoints.map((tp, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i + 2}
                className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
                  {tp.icon}
                </div>
                <p className="text-sm font-medium text-foreground">{tp.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-lg mx-auto rounded-3xl gradient-primary p-8 text-center shadow-soft"
        >
          <h2 className="text-2xl font-bold text-primary-foreground mb-3">Bereit loszulegen?</h2>
          <p className="text-primary-foreground/80 text-sm mb-6 max-w-xs mx-auto">
            Installiere Hearo jetzt – kostenlos, kein App Store nötig.
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
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center space-y-2">
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <button onClick={() => navigate("/privacy")} className="hover:text-foreground underline transition-colors">Datenschutz</button>
          <span className="text-border">·</span>
          <button onClick={() => navigate("/terms")} className="hover:text-foreground underline transition-colors">Nutzungsbedingungen</button>
        </div>
        <p className="text-xs text-muted-foreground/60">© {new Date().getFullYear()} Hearo · Alle Rechte vorbehalten</p>
      </footer>
    </div>
  );
};

export default LandingPage;
