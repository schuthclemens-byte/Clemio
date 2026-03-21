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
          <p className="text-sm text-muted-foreground leading-relaxed">
            Dein Vertrauen ist uns wichtig. Diese Datenschutzerklärung erklärt, welche Daten Hearo erhebt, 
            wofür sie verwendet werden und wie du die Kontrolle behältst.
          </p>
        </section>

        {/* Section 1 */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up">
          <h3 className="font-semibold text-[0.938rem] mb-3">1. Welche Daten sammeln wir?</h3>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <div>
              <p className="font-medium text-foreground mb-1">Kontodaten</p>
              <p>E-Mail-Adresse, Anzeigename und optionales Profilbild – notwendig für dein Konto.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Nachrichten</p>
              <p>Deine Nachrichten werden verschlüsselt gespeichert, damit du sie zwischen Geräten synchronisieren kannst.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Stimmdaten</p>
              <p>Wenn du das Stimmen-Klonen nutzt, wird eine kurze Sprachprobe verarbeitet, um ein digitales Stimmmodell zu erstellen. 
                 Die originale Aufnahme wird nach der Verarbeitung gelöscht. Das Stimmmodell wird sicher gespeichert und 
                 <strong className="text-foreground"> nur mit deiner ausdrücklichen Zustimmung</strong> für andere hörbar.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Nutzungsdaten</p>
              <p>Anonymisierte Daten zur App-Nutzung (z.B. welche Funktionen genutzt werden), um Hearo zu verbessern. Keine Weitergabe an Dritte.</p>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "60ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">2. Wofür nutzen wir deine Daten?</h3>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <li className="flex gap-2"><span className="text-primary">•</span>Bereitstellung der App-Funktionen (Messaging, Vorlesen, Übersetzen)</li>
            <li className="flex gap-2"><span className="text-primary">•</span>Erstellen und Verwalten deines Stimmmodells</li>
            <li className="flex gap-2"><span className="text-primary">•</span>Verbesserung der App-Qualität</li>
            <li className="flex gap-2"><span className="text-primary">•</span>Abo-Verwaltung und Zahlungsabwicklung</li>
          </ul>
        </section>

        {/* Section 3 - Voice */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "120ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">3. Stimmdaten & Einwilligung</h3>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>Deine Stimme ist besonders schützenswert. Deshalb gelten strenge Regeln:</p>
            <ul className="space-y-2">
              <li className="flex gap-2"><span className="text-accent">✓</span>Stimmen-Klonen ist <strong className="text-foreground">freiwillig</strong> und erfordert deine aktive Zustimmung</li>
              <li className="flex gap-2"><span className="text-accent">✓</span>Andere können deine Stimme <strong className="text-foreground">nur hören, wenn du es erlaubst</strong></li>
              <li className="flex gap-2"><span className="text-accent">✓</span>Du kannst jede Freigabe <strong className="text-foreground">jederzeit widerrufen</strong></li>
              <li className="flex gap-2"><span className="text-accent">✓</span>Du kannst dein Stimmmodell <strong className="text-foreground">jederzeit komplett löschen</strong></li>
              <li className="flex gap-2"><span className="text-accent">✓</span>Die Verarbeitung erfolgt über ElevenLabs (USA) unter strengen Datenschutzvereinbarungen</li>
            </ul>
          </div>
        </section>

        {/* Section 4 */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "180ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">4. Deine Rechte</h3>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <li className="flex gap-2"><span className="text-primary">•</span><strong className="text-foreground">Auskunft:</strong> Du kannst jederzeit erfahren, welche Daten wir über dich gespeichert haben</li>
            <li className="flex gap-2"><span className="text-primary">•</span><strong className="text-foreground">Löschung:</strong> Du kannst dein Konto und alle Daten jederzeit löschen</li>
            <li className="flex gap-2"><span className="text-primary">•</span><strong className="text-foreground">Widerruf:</strong> Du kannst deine Einwilligung zur Stimmverarbeitung jederzeit widerrufen</li>
            <li className="flex gap-2"><span className="text-primary">•</span><strong className="text-foreground">Export:</strong> Du hast das Recht, deine Daten in einem gängigen Format zu erhalten</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "240ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">5. Datensicherheit</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Alle Daten werden verschlüsselt übertragen (TLS) und auf sicheren Servern gespeichert. 
            Wir verwenden branchenübliche Sicherheitsstandards und beschränken den Zugriff auf das Minimum.
          </p>
        </section>

        {/* Section 6 */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "300ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">6. Abonnement & Zahlung</h3>
          <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p>Hearo bietet eine kostenlose Testphase von 7 Tagen. Danach kostet das Abo 4,99 €/Monat.</p>
            <ul className="space-y-1">
              <li className="flex gap-2"><span className="text-primary">•</span>Das Abo verlängert sich automatisch, sofern du nicht kündigst</li>
              <li className="flex gap-2"><span className="text-primary">•</span>Kündigung jederzeit in den App-Einstellungen oder über den App Store</li>
              <li className="flex gap-2"><span className="text-primary">•</span>Bereits bezahlte Zeiträume werden nicht erstattet</li>
            </ul>
          </div>
        </section>

        {/* Section 7 */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border animate-reveal-up" style={{ animationDelay: "360ms" }}>
          <h3 className="font-semibold text-[0.938rem] mb-3">7. Kontakt</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Bei Fragen zum Datenschutz erreichst du uns unter:{" "}
            <a href="mailto:privacy@hearo.app" className="text-primary font-medium hover:underline">
              privacy@hearo.app
            </a>
          </p>
        </section>

        <div className="h-8" />
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
