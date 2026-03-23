import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Download, ArrowLeft, Smartphone, Monitor, Globe, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const InstallPage = () => {
  const navigate = useNavigate();
  const [apkUrl, setApkUrl] = useState<string | null>(null);
  const [desktopUrl, setDesktopUrl] = useState<string | null>(null);
  const [checkingApk, setCheckingApk] = useState(true);
  const [checkingDesktop, setCheckingDesktop] = useState(true);

  useEffect(() => {
    // Check APK availability
    const { data: apkData } = supabase.storage.from("downloads").getPublicUrl("clevara.apk");
    if (apkData?.publicUrl) {
      fetch(apkData.publicUrl, { method: "HEAD" })
        .then((r) => { if (r.ok) setApkUrl(apkData.publicUrl); })
        .catch(() => {})
        .finally(() => setCheckingApk(false));
    } else {
      setCheckingApk(false);
    }

    // Check Desktop installer availability
    const { data: desktopData } = supabase.storage.from("downloads").getPublicUrl("clevara-setup.exe");
    if (desktopData?.publicUrl) {
      fetch(desktopData.publicUrl, { method: "HEAD" })
        .then((r) => { if (r.ok) setDesktopUrl(desktopData.publicUrl); })
        .catch(() => {})
        .finally(() => setCheckingDesktop(false));
    } else {
      setCheckingDesktop(false);
    }
  }, []);

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
          <h1 className="font-semibold text-lg">Clevara herunterladen</h1>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center px-6 pt-8 pb-12">
        {/* App icon */}
        <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 shadow-lg">
          <img src="/icon-192.png" alt="Clevara" className="w-20 h-20 rounded-2xl" />
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">Clevara</h2>
        <p className="text-muted-foreground text-center text-sm mb-10 max-w-xs">
          Lade Clevara als App herunter – für dein Handy oder deinen Computer.
        </p>

        {/* Download cards */}
        <div className="w-full max-w-sm space-y-4">

          {/* Android */}
          <DownloadCard
            icon={Smartphone}
            title="Android"
            description="APK direkt herunterladen und installieren"
            loading={checkingApk}
            available={!!apkUrl}
            url={apkUrl}
            fileName="clevara.apk"
            buttonLabel="APK herunterladen"
            unavailableText="APK wird vorbereitet…"
          />

          {/* Windows Desktop */}
          <DownloadCard
            icon={Monitor}
            title="Windows"
            description="Desktop-App für Windows herunterladen"
            loading={checkingDesktop}
            available={!!desktopUrl}
            url={desktopUrl}
            fileName="clevara-setup.exe"
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
                  Kein Download nötig – Clevara funktioniert auch direkt im Browser.
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

        {/* Features */}
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
  icon: Icon,
  title,
  description,
  loading,
  available,
  url,
  fileName,
  buttonLabel,
  unavailableText,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  loading: boolean;
  available: boolean;
  url: string | null;
  fileName: string;
  buttonLabel: string;
  unavailableText: string;
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
