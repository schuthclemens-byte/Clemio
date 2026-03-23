import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card/90 glass border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors active:scale-95"
            aria-label="Zurück"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Datenschutz</h1>
        </div>
      </header>

      <div className="flex-1 p-5 space-y-6 max-w-2xl mx-auto">
        {/* Intro */}
        <section className="animate-reveal-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Datenschutzerklärung</h2>
              <p className="text-xs text-muted-foreground">Zuletzt aktualisiert: März 2026</p>
            </div>
          </div>
        </section>

        {/* 1. Allgemeines */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up">
          <h3 className="font-semibold text-[0.938rem] mb-3">1. Allgemeines</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Diese App ermöglicht Kommunikation über Text, Sprache und KI-gestützte Funktionen 
            (z.&nbsp;B. Vorlesen und Stimmen-Simulation). Der Schutz deiner Daten ist uns wichtig.
          </p>
        </section>

        {/* 2. Welche Daten wir verarbeiten */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "60ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">2. Welche Daten wir verarbeiten</h3>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <div className="flex gap-2"><span className="text-primary">•</span><p><strong className="text-foreground">Account-Daten</strong> (z.&nbsp;B. E-Mail oder Login)</p></div>
            <div className="flex gap-2"><span className="text-primary">•</span><p><strong className="text-foreground">Nachrichten</strong> (Text und Sprache)</p></div>
            <div className="flex gap-2"><span className="text-primary">•</span><p><strong className="text-foreground">Sprachaufnahmen</strong> (für Voice Cloning, nur mit Zustimmung)</p></div>
            <div className="flex gap-2"><span className="text-primary">•</span><p><strong className="text-foreground">Nutzungsdaten</strong> (z.&nbsp;B. App-Funktionen)</p></div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            Diese Daten sind notwendig, um die App bereitzustellen und zu verbessern.
          </p>
        </section>

        {/* 3. Voice Cloning */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "120ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">3. Voice Cloning</h3>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>Wenn du eine Stimme hinzufügst:</p>
            <ul className="space-y-2">
              <li className="flex gap-2"><span className="text-accent">•</span>wird deine Sprachaufnahme verarbeitet, um eine künstliche Stimme zu erstellen</li>
              <li className="flex gap-2"><span className="text-accent">•</span>diese Stimme wird nur für deine Nutzung in der App verwendet</li>
            </ul>
            <div className="bg-primary/5 rounded-xl p-4 mt-3 space-y-2">
              <p className="font-semibold text-foreground text-sm">⚠️ Wichtig:</p>
              <ul className="space-y-1.5">
                <li className="flex gap-2"><span className="text-accent">✓</span>Nutzung erfolgt <strong className="text-foreground">nur mit deiner ausdrücklichen Zustimmung</strong></li>
                <li className="flex gap-2"><span className="text-accent">✓</span>Du kannst deine Stimme <strong className="text-foreground">jederzeit löschen</strong></li>
                <li className="flex gap-2"><span className="text-accent">✓</span>Ohne Zustimmung wird <strong className="text-foreground">KEINE Stimme erstellt</strong></li>
              </ul>
            </div>
            <p className="text-xs text-muted-foreground mt-2 italic">
              Stimmen gelten als besonders schützenswert und dürfen nur mit Einwilligung genutzt werden.
            </p>
          </div>
        </section>

        {/* 4. Nutzung deiner Daten */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "180ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">4. Nutzung deiner Daten</h3>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <li className="flex gap-2"><span className="text-primary">•</span>Bereitstellung der App</li>
            <li className="flex gap-2"><span className="text-primary">•</span>Kommunikation zwischen Nutzern</li>
            <li className="flex gap-2"><span className="text-primary">•</span>Verbesserung der Funktionen</li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            Es erfolgt keine Weitergabe deiner Daten an Dritte, außer wenn es technisch notwendig ist (z.&nbsp;B. Serverbetrieb).
          </p>
        </section>

        {/* 5. Speicherung & Sicherheit */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "240ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">5. Speicherung & Sicherheit</h3>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <li className="flex gap-2"><span className="text-accent">✓</span>Deine Daten werden sicher gespeichert</li>
            <li className="flex gap-2"><span className="text-accent">✓</span>Zugriff nur, wenn notwendig</li>
            <li className="flex gap-2"><span className="text-accent">✓</span>Schutz vor unbefugtem Zugriff</li>
          </ul>
        </section>

        {/* 6. Deine Rechte */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "300ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">6. Deine Rechte</h3>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <li className="flex gap-2"><span className="text-primary">•</span><strong className="text-foreground">Auskunft</strong> über deine Daten</li>
            <li className="flex gap-2"><span className="text-primary">•</span><strong className="text-foreground">Löschung</strong> deiner Daten</li>
            <li className="flex gap-2"><span className="text-primary">•</span><strong className="text-foreground">Widerruf</strong> deiner Einwilligung</li>
          </ul>
          <div className="bg-primary/5 rounded-xl p-3 mt-3">
            <p className="text-sm text-foreground font-medium">
              ➡️ Du kannst deine Stimme jederzeit entfernen
            </p>
          </div>
        </section>

        {/* 7. Freiwilligkeit */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "360ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">7. Freiwilligkeit</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Die Nutzung der App ist freiwillig. Wenn du keine Sprachdaten bereitstellst, 
            kannst du die App trotzdem eingeschränkt nutzen.
          </p>
        </section>

        {/* 8. Kontakt */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "420ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">8. Kontakt</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Bei Fragen zum Datenschutz kannst du uns kontaktieren:{" "}
            <a href="mailto:privacy@voxa.app" className="text-primary font-medium hover:underline">
              privacy@voxa.app
            </a>
          </p>
        </section>

        {/* Trust badge */}
        <section className="animate-reveal-up" style={{ animationDelay: "480ms" }}>
          <div className="bg-accent/5 border border-accent/10 rounded-2xl p-4 text-center">
            <p className="text-sm font-medium text-foreground">
              🔐 Stimmen werden nur mit deiner Zustimmung verwendet und können jederzeit gelöscht werden.
            </p>
          </div>
        </section>

        <div className="h-8" />
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
