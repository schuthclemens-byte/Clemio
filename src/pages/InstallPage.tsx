import { useState, useEffect } from "react";
import { useSmartBack } from "@/hooks/useSmartBack";
import { useNavigate } from "react-router-dom";
import { Download, ArrowLeft, Smartphone, Monitor, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscribeToInstallPrompt, DeferredInstallPromptEvent, clearDeferredInstallPrompt } from "@/lib/installPrompt";

const InstallPage = () => {
  const { goBack, swipeHandlers } = useSmartBack("/settings");
  const navigate = useNavigate();
  const [desktopUrl, setDesktopUrl] = useState<string | null>(null);
  const [checkingDesktop, setCheckingDesktop] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<DeferredInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    fetch("/clemio-setup.zip", { method: "HEAD" })
      .then((r) => { if (r.ok) setDesktopUrl("/clemio-setup.zip"); })
      .catch(() => {})
      .finally(() => setCheckingDesktop(false));

    const unsub = subscribeToInstallPrompt((prompt) => setInstallPrompt(prompt));
    return unsub;
  }, []);

  const handleInstallPWA = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      clearDeferredInstallPrompt();
    }
  };

  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const isNativeApp = !!(window as any).Capacitor?.isNativePlatform?.();

  // If running as native app, redirect to settings
  useEffect(() => {
    if (isNativeApp) navigate("/settings", { replace: true });
  }, [isNativeApp, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col" {...swipeHandlers}>
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={goBack}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-lg">Clemio herunterladen</h1>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center px-6 pt-8 pb-12">
        <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 shadow-lg">
          <img src="/icon-192.png" alt="Clemio" className="w-20 h-20 rounded-2xl" />
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">Clemio</h2>
        <p className="text-muted-foreground text-center text-sm mb-10 max-w-xs">
          Lade Clemio als App herunter – für dein Handy oder deinen Computer.
        </p>

        <div className="w-full max-w-sm space-y-4">

          {/* Web-App installieren (PWA) */}
          <div className="bg-card rounded-2xl border border-border/50 p-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[0.938rem]">Web-App installieren</h3>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                  Installiere Clemio direkt auf deinem Gerät – ohne App Store. Funktioniert auf Handy & Computer.
                </p>

                {isStandalone || installed ? (
                  <p className="text-xs text-primary font-medium">✓ Bereits installiert</p>
                ) : installPrompt ? (
                  <Button size="sm" className="rounded-full gap-2" onClick={handleInstallPWA}>
                    <Download className="w-4 h-4" />
                    Jetzt installieren
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Öffne Clemio im Browser und tippe auf <strong>„Teilen"</strong> → <strong>„Zum Startbildschirm"</strong> (iPhone) oder auf das <strong>Menü ⋮</strong> → <strong>„App installieren"</strong> (Android / Desktop).
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Android – Kommt bald */}
          <div className="bg-card rounded-2xl border border-border/50 p-4 opacity-70">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Smartphone className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[0.938rem]">Android App</h3>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                  Eine native Android-App ist in Entwicklung.
                </p>
                <p className="text-xs text-muted-foreground/70 italic">Kommt bald</p>
              </div>
            </div>
          </div>

          {/* Windows Desktop */}
          <DownloadCard
            icon={Monitor}
            title="Windows"
            description="ZIP herunterladen, entpacken & Clemio.exe starten"
            loading={checkingDesktop}
            available={!!desktopUrl}
            url={desktopUrl}
            fileName="clemio-setup.zip"
            buttonLabel="Für Windows herunterladen"
            unavailableText="Desktop-App kommt bald"
          />

          {/* Browser fallback */}
          <div className="bg-card rounded-2xl border border-border/50 p-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[0.938rem]">Im Browser nutzen</h3>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                  Kein Download nötig – Clemio funktioniert auch direkt im Browser.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/login")}
                  className="rounded-full gap-2"
                >
                  Direkt starten
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 space-y-6 max-w-sm w-full">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Was du bekommst</h3>
            <Feature emoji="🎤" text="Voller Zugriff auf Mikrofon & Kamera" />
            <Feature emoji="🔔" text="Push-Benachrichtigungen" />
            <Feature emoji="⚡" text="Startet wie eine echte App – schnell & offline-fähig" />
            <Feature emoji="🔒" text="Ende-zu-Ende verschlüsselt" />
          </div>
        </div>
      </div>
    </div>
  );
};

function DownloadCard({
  icon: Icon, title, description, loading, available, url, fileName, buttonLabel, unavailableText,
}: {
  icon: React.ElementType; title: string; description: string; loading: boolean;
  available: boolean; url: string | null; fileName: string; buttonLabel: string; unavailableText: string;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-4">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[0.938rem]">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 mb-3">{description}</p>
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Wird geprüft…
            </div>
          ) : available && url ? (
            <Button asChild size="sm" className="rounded-full gap-2">
              <a href={url} download={fileName}>
                <Download className="w-4 h-4" />
                {buttonLabel}
              </a>
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground/70 italic">{unavailableText}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Feature({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-center gap-3 bg-card/50 rounded-xl px-4 py-3 border border-border/50">
      <span className="text-lg">{emoji}</span>
      <span className="text-sm text-foreground">{text}</span>
    </div>
  );
}

export default InstallPage;
