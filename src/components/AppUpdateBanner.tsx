import { Download, X, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { useState } from "react";
import { cn } from "@/lib/utils";

const AppUpdateBanner = () => {
  const { showBanner, forceUpdate, latestVersion, changelog, dismiss, openStore, storeUrl } = useAppUpdate();
  const [changelogOpen, setChangelogOpen] = useState(false);

  if (!showBanner) return null;

  return (
    <>
      {/* Force update: full-screen overlay */}
      {forceUpdate && (
        <div className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-sm" />
      )}

      <div
        className={cn(
          "fixed left-0 right-0 z-[10000] px-4 animate-reveal-up",
          forceUpdate
            ? "inset-0 flex items-center justify-center"
            : "top-0 pt-[env(safe-area-inset-top)]"
        )}
      >
        <div
          className={cn(
            "bg-card border shadow-lg",
            forceUpdate
              ? "rounded-2xl max-w-sm w-full p-6 border-destructive/30"
              : "rounded-b-2xl p-4 border-border/50"
          )}
        >
          {/* Header */}
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                forceUpdate ? "bg-destructive/10" : "bg-primary/10"
              )}
            >
              {forceUpdate ? (
                <AlertTriangle className="w-5 h-5 text-destructive" />
              ) : (
                <Download className="w-5 h-5 text-primary" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[0.938rem]">
                {forceUpdate ? "Wichtiges Update erforderlich" : "Update verfügbar"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Version {latestVersion}
                {forceUpdate && " – Bitte aktualisiere die App, um fortzufahren."}
              </p>
            </div>

            {!forceUpdate && (
              <button
                onClick={dismiss}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors shrink-0"
                aria-label="Später"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Changelog */}
          {changelog && (
            <div className="mt-3">
              <button
                onClick={() => setChangelogOpen(!changelogOpen)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Was ist neu?
                {changelogOpen ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
              {changelogOpen && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed whitespace-pre-line bg-secondary/50 rounded-xl p-3">
                  {changelog}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className={cn("flex gap-2 mt-4", forceUpdate ? "flex-col" : "")}>
            {storeUrl && (
              <button
                onClick={openStore}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold transition-all active:scale-[0.97]"
              >
                <Download className="w-4 h-4" />
                Jetzt aktualisieren
              </button>
            )}
            {!forceUpdate && (
              <button
                onClick={dismiss}
                className="flex-1 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium transition-all active:scale-[0.97]"
              >
                Später
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AppUpdateBanner;
