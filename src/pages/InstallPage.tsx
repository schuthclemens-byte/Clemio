import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Check, Share, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  clearDeferredInstallPrompt,
  getDeferredInstallPrompt,
  subscribeToInstallPrompt,
  type DeferredInstallPromptEvent,
} from "@/lib/installPrompt";

const InstallPage = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredInstallPromptEvent | null>(getDeferredInstallPrompt());
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
    }

    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream);

    const unsubscribe = subscribeToInstallPrompt(setDeferredPrompt);
    const handleInstalled = () => setIsInstalled(true);

    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      unsubscribe();
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    clearDeferredInstallPrompt();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-lg">App installieren</h1>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 shadow-lg">
          <img src="/icon-192.png" alt="Hearo" className="w-20 h-20 rounded-2xl" />
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">Hearo</h2>
        <p className="text-muted-foreground text-center text-sm mb-8 max-w-xs">
          Installiere Hearo auf deinem Gerät für den schnellsten Zugriff – wie eine echte App.
        </p>

        {isInstalled ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
              <Check className="w-8 h-8 text-accent" />
            </div>
            <p className="text-accent font-medium">Bereits installiert!</p>
            <Button variant="outline" onClick={() => navigate("/chats")} className="mt-4">
              Zu den Chats
            </Button>
          </div>
        ) : isIOS ? (
          <div className="bg-card rounded-2xl p-6 border border-border max-w-sm w-full">
            <h3 className="font-semibold text-sm mb-4 text-foreground">So installierst du Hearo:</h3>
            <div className="space-y-4">
              <Step number={1}>
                Tippe auf <Share className="w-4 h-4 inline text-primary" /> <strong>Teilen</strong> in der Safari-Leiste
              </Step>
              <Step number={2}>
                Scrolle runter und tippe auf <strong>„Zum Home-Bildschirm“</strong>
              </Step>
              <Step number={3}>
                Tippe auf <strong>„Hinzufügen“</strong>
              </Step>
            </div>
          </div>
        ) : deferredPrompt ? (
          <Button
            onClick={handleInstall}
            size="lg"
            className="rounded-full px-8 gap-2 text-base"
          >
            <Download className="w-5 h-5" />
            Jetzt installieren
          </Button>
        ) : (
          <div className="bg-card rounded-2xl p-6 border border-border max-w-sm w-full">
            <h3 className="font-semibold text-sm mb-4 text-foreground">So installierst du Hearo:</h3>
            <div className="space-y-4">
              <Step number={1}>
                Öffne das <strong>Browser-Menü</strong> (⋮ oben rechts)
              </Step>
              <Step number={2}>
                Tippe auf <strong>„App installieren“</strong> oder <strong>„Zum Startbildschirm hinzufügen“</strong>
              </Step>
              <Step number={3}>
                Bestätige mit <strong>„Installieren“</strong>
              </Step>
            </div>
          </div>
        )}

        <div className="mt-10 space-y-3 max-w-sm w-full">
          <Feature emoji="⚡" text="Sofortiger Start – kein Browser nötig" />
          <Feature emoji="📴" text="Funktioniert auch offline" />
          <Feature emoji="🔔" text="Benachrichtigungen wie eine echte App" />
          <Feature emoji="💾" text="Kein Download aus dem Store nötig" />
        </div>
      </div>
    </div>
  );
};

function Step({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
        {number}
      </span>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
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
