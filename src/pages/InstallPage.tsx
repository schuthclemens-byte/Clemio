import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Check, Share, ArrowLeft, HelpCircle, Smartphone, Monitor, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  clearDeferredInstallPrompt,
  getDeferredInstallPrompt,
  subscribeToInstallPrompt,
  type DeferredInstallPromptEvent,
} from "@/lib/installPrompt";

const APK_FILE_NAME = "hearo.apk";

const InstallPage = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredInstallPromptEvent | null>(getDeferredInstallPrompt());
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [apkUrl, setApkUrl] = useState<string | null>(null);

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

    // Check if APK exists in storage
    const { data } = supabase.storage.from("downloads").getPublicUrl(APK_FILE_NAME);
    if (data?.publicUrl) {
      // Verify the file actually exists by trying a HEAD request
      fetch(data.publicUrl, { method: "HEAD" })
        .then((res) => {
          if (res.ok) setApkUrl(data.publicUrl);
        })
        .catch(() => {});
    }

    return () => {
      unsubscribe();
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setShowHelp(true);
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    clearDeferredInstallPrompt();
  };

  return (
    <>
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
          ) : (
            <div className="flex w-full max-w-sm flex-col gap-3">
              {/* APK Download Button */}
              {apkUrl && (
                <Button
                  asChild
                  size="lg"
                  className="w-full rounded-full px-8 gap-2 text-base"
                >
                  <a href={apkUrl} download={APK_FILE_NAME}>
                    <Smartphone className="w-5 h-5" />
                    Android App herunterladen (.apk)
                  </a>
                </Button>
              )}

              {/* PWA Install Button */}
              <Button
                onClick={handleInstall}
                size="lg"
                variant={apkUrl ? "outline" : "default"}
                className="w-full rounded-full px-8 gap-2 text-base"
              >
                <Download className="w-5 h-5" />
                {deferredPrompt ? "Als Web-App installieren" : "Als Web-App installieren"}
              </Button>

              <Button
                variant="ghost"
                size="lg"
                onClick={() => setShowHelp(true)}
                className="w-full rounded-full px-8 gap-2 text-base text-muted-foreground"
              >
                <HelpCircle className="w-5 h-5" />
                Installationshilfe
              </Button>
            </div>
          )}

          {/* Platform sections */}
          <div className="mt-10 space-y-6 max-w-sm w-full">
            {/* Mobile */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Smartphone className="w-4 h-4 text-primary" />
                Handy (Android & iOS)
              </div>
              <Feature emoji="📲" text="APK herunterladen oder als Web-App installieren" />
              <Feature emoji="🎤" text="Voller Zugriff auf Mikrofon & Kamera" />
              <Feature emoji="🔔" text="Push-Benachrichtigungen" />
            </div>

            {/* Desktop */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Monitor className="w-4 h-4 text-primary" />
                Desktop (Windows / Mac)
              </div>
              <Feature emoji="💻" text="In Chrome/Edge: Menü → 'App installieren'" />
              <Feature emoji="⚡" text="Startet wie eine echte App – ohne Browser-Tab" />
              <Feature emoji="🎙️" text="Mikrofon & Kamera für Anrufe" />
            </div>

            {/* Browser */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Globe className="w-4 h-4 text-primary" />
                Browser
              </div>
              <Feature emoji="🌐" text="Ohne Installation direkt im Browser nutzen" />
              <Feature emoji="📴" text="Funktioniert auch offline (nach erstem Laden)" />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>So installierst du Hearo</DialogTitle>
            <DialogDescription>
              Wenn der direkte Install-Dialog nicht erscheint, nutze diese Schritte auf deinem Handy.
            </DialogDescription>
          </DialogHeader>

          {isIOS ? (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">iPhone / iPad</p>
              <Step number={1}>
                Tippe auf <Share className="w-4 h-4 inline text-primary" /> <strong>Teilen</strong> in Safari
              </Step>
              <Step number={2}>
                Wähle <strong>„Zum Home-Bildschirm"</strong>
              </Step>
              <Step number={3}>
                Tippe auf <strong>„Hinzufügen"</strong>
              </Step>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">📱 Handy (Android)</p>
                <Step number={1}>
                  Öffne in Chrome das <strong>3-Punkte-Menü</strong>
                </Step>
                <Step number={2}>
                  Tippe auf <strong>„App installieren"</strong> oder <strong>„Zum Startbildschirm hinzufügen"</strong>
                </Step>
                <Step number={3}>
                  Bestätige mit <strong>„Installieren"</strong>
                </Step>
              </div>
              <div className="border-t border-border pt-4 space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">💻 Desktop (Windows / Mac)</p>
                <Step number={1}>
                  Öffne Hearo in <strong>Chrome</strong> oder <strong>Microsoft Edge</strong>
                </Step>
                <Step number={2}>
                  Klicke oben rechts auf das <strong>Install-Symbol</strong> (⊕) in der Adressleiste oder gehe ins <strong>3-Punkte-Menü → „App installieren"</strong>
                </Step>
                <Step number={3}>
                  Klicke auf <strong>„Installieren"</strong> – Hearo öffnet sich als eigenes Fenster
                </Step>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
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
