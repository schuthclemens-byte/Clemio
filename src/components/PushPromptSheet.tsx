import { useState, useEffect, useCallback } from "react";
import { Bell, X, Smartphone } from "lucide-react";
import { usePushCapability } from "@/hooks/usePushCapability";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";

const DISMISSED_KEY = "clemio_push_prompt_dismissed";
const DISMISSED_UNSUPPORTED_KEY = "clemio_push_unsupported_dismissed";

const ALLOWED_ROUTES = ["/chats", "/chat/", "/settings", "/profile", "/focus-mode", "/contact-autoplay", "/voice-recordings"];

const PushPromptSheet = () => {
  const { user } = useAuth();
  const pushCap = usePushCapability();
  const { status, subscribe } = usePushSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [activating, setActivating] = useState(false);
  const [result, setResult] = useState<"success" | "denied" | null>(null);

  // Reset dismissed state when push subscription is lost (e.g. after reinstall)
  useEffect(() => {
    if (!user) return;
    if (status.savedToBackend) return;
    // If we know push CAN work but it's not saved, clear dismiss so prompt re-appears
    if (pushCap.canUsePush && !status.savedToBackend) {
      localStorage.removeItem(DISMISSED_KEY);
    }
  }, [user, pushCap.canUsePush, status.savedToBackend]);

  useEffect(() => {
    if (!user) return;
    const onAllowedRoute = ALLOWED_ROUTES.some(r => location.pathname.startsWith(r));
    if (!onAllowedRoute) return;

    // Already saved → don't show
    if (status.savedToBackend) return;

    if (pushCap.canUsePush) {
      if (localStorage.getItem(DISMISSED_KEY) === "true") return;
    } else {
      if (localStorage.getItem(DISMISSED_UNSUPPORTED_KEY) === "true") return;
    }

    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, [user, location.pathname, status.savedToBackend, pushCap.canUsePush]);

  const handleDismiss = useCallback(() => {
    if (pushCap.canUsePush) {
      localStorage.setItem(DISMISSED_KEY, "true");
    } else {
      localStorage.setItem(DISMISSED_UNSUPPORTED_KEY, "true");
    }
    setVisible(false);
  }, [pushCap.canUsePush]);

  const handleActivate = useCallback(async () => {
    setActivating(true);
    const ok = await subscribe();
    setActivating(false);
    if (ok) {
      setResult("success");
      setTimeout(() => setVisible(false), 2000);
    } else {
      setResult("denied");
    }
  }, [subscribe]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-300" onClick={handleDismiss} />
      <div className="relative w-full max-w-md mx-auto bg-card rounded-t-3xl shadow-2xl border-t border-border animate-in slide-in-from-bottom duration-400 p-6 pb-8 space-y-4">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
          aria-label="Schließen"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {!pushCap.canUsePush ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <Bell className="w-7 h-7 text-destructive" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-lg font-bold">Push wird nicht unterstützt</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{pushCap.reason}</p>
            </div>
            {pushCap.isIOSBrowserOnly && (
              <button
                onClick={() => { handleDismiss(); navigate("/install"); }}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary/10 text-primary font-semibold text-sm transition-all active:scale-[0.97]"
              >
                <Smartphone className="w-4 h-4" />
                App zum Home-Bildschirm hinzufügen
              </button>
            )}
          </>
        ) : result === "success" ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Bell className="w-7 h-7 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold">Push aktiviert ✓</h2>
              <p className="text-sm text-muted-foreground">Du erhältst jetzt Benachrichtigungen.</p>
            </div>
          </>
        ) : result === "denied" ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <Bell className="w-7 h-7 text-destructive" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-lg font-bold">Berechtigung verweigert</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Du hast die Benachrichtigungs-Berechtigung abgelehnt. Du kannst sie in den Einstellungen wieder aktivieren.
              </p>
            </div>
            <button onClick={handleDismiss} className="w-full py-3 rounded-2xl bg-secondary text-foreground font-medium text-sm">
              Verstanden
            </button>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
              <Bell className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-lg font-bold">Push-Benachrichtigungen aktivieren</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Erhalte Benachrichtigungen über neue Nachrichten – auch wenn die App geschlossen ist.
              </p>
            </div>
            <button
              onClick={handleActivate}
              disabled={activating}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-60",
                "gradient-primary text-primary-foreground shadow-soft"
              )}
            >
              {activating ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              {activating ? "Wird aktiviert…" : "Aktivieren"}
            </button>
            <button onClick={handleDismiss} className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Später
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PushPromptSheet;
