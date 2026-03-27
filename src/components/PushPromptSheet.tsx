import { useState, useEffect, useCallback } from "react";
import { Bell, X, Smartphone } from "lucide-react";
import { usePushCapability } from "@/hooks/usePushCapability";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";

const DISMISSED_KEY = "clemio_push_prompt_dismissed";
const DISMISSED_UNSUPPORTED_KEY = "clemio_push_unsupported_dismissed";

/** Routes where the push prompt should appear */
const ALLOWED_ROUTES = ["/chats", "/chat/", "/settings", "/profile", "/focus-mode", "/contact-autoplay", "/voice-recordings"];
/**
 * Bottom-sheet style prompt shown once after login to encourage
 * push activation. Only triggers the browser permission dialog
 * on an explicit user tap (browserkonform).
 */
const PushPromptSheet = () => {
  const { user } = useAuth();
  const pushCap = usePushCapability();
  const { debug, subscribe } = usePushSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [activating, setActivating] = useState(false);
  const [result, setResult] = useState<"success" | "denied" | null>(null);

  // Decide whether to show the prompt
  useEffect(() => {
    // Must be logged in
    if (!user) return;

    // Only show on protected app routes, not landing/login/install etc.
    const onAllowedRoute = ALLOWED_ROUTES.some(r => location.pathname.startsWith(r));
    if (!onAllowedRoute) return;

    if (debug.loading) return;

    // Already subscribed → don't show
    if (debug.pushSubscription && debug.backendSubscription) return;

    // Permission already denied by browser → don't show (can't recover)
    if (debug.notificationPermission === "denied") return;

    // If push is supported: check if already dismissed
    if (pushCap.canUsePush) {
      if (localStorage.getItem(DISMISSED_KEY) === "true") return;
    } else {
      // Push not supported (e.g. iOS browser): show install hint
      // but only once per "unsupported" dismissal
      if (localStorage.getItem(DISMISSED_UNSUPPORTED_KEY) === "true") return;
    }

    // Small delay so the app feels loaded
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, [user, location.pathname, debug.loading, debug.pushSubscription, debug.backendSubscription, debug.notificationPermission, pushCap.canUsePush]);

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
      // Auto-close after success
      setTimeout(() => setVisible(false), 2000);
    } else {
      setResult("denied");
    }
  }, [subscribe]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 animate-in fade-in duration-300"
        onClick={handleDismiss}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-md mx-auto bg-card rounded-t-3xl shadow-2xl border-t border-border animate-in slide-in-from-bottom duration-400 p-6 pb-8 space-y-4">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
          aria-label="Schließen"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {!pushCap.canUsePush ? (
          /* ── Push NOT supported ── */
          <>
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <Bell className="w-7 h-7 text-destructive" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-lg font-bold">Push wird nicht unterstützt</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {pushCap.reason}
              </p>
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
          /* ── Success state ── */
          <>
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Bell className="w-7 h-7 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold">Push aktiviert ✓</h2>
              <p className="text-sm text-muted-foreground">Du erhältst jetzt Benachrichtigungen über neue Nachrichten.</p>
            </div>
          </>
        ) : result === "denied" ? (
          /* ── Denied state ── */
          <>
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <Bell className="w-7 h-7 text-destructive" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-lg font-bold">Berechtigung verweigert</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Du hast die Benachrichtigungs-Berechtigung abgelehnt. Du kannst sie in den Browser-Einstellungen wieder aktivieren.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="w-full py-3 rounded-2xl bg-secondary text-foreground font-medium text-sm"
            >
              Verstanden
            </button>
          </>
        ) : (
          /* ── Default prompt state ── */
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

            {/* Primary CTA – triggers browser permission on tap */}
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

            {/* Secondary dismiss */}
            <button
              onClick={handleDismiss}
              className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Später
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PushPromptSheet;
