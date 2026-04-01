import { useState, useEffect, useCallback } from "react";
import { Bell, X, Smartphone } from "lucide-react";
import { usePushCapability } from "@/hooks/usePushCapability";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";

/** localStorage: permanently dismissed after denial or manual close */
const DISMISSED_KEY = "clemio_push_prompt_dismissed";
/** localStorage: timestamp of last prompt shown — throttle to once per 7 days */
const LAST_PROMPT_KEY = "clemio_push_prompt_last_shown";
const PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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

  useEffect(() => {
    if (!user) return;
    if (!status.initialCheckDone) return;

    const onAllowedRoute = ALLOWED_ROUTES.some(r => location.pathname.startsWith(r));
    if (!onAllowedRoute) return;

    // ── Never show if push is already active ──
    if (status.state === "active" || status.savedToBackend) {
      console.log("[PushPrompt] state=active → no prompt");
      return;
    }

    // ── Never show if permission denied ──
    if (status.state === "denied") {
      console.log("[PushPrompt] state=denied → no prompt");
      return;
    }

    // ── Check actual browser permission as failsafe ──
    if ("Notification" in window && Notification.permission === "denied") {
      console.log("[PushPrompt] Notification.permission=denied → no prompt");
      return;
    }
    if ("Notification" in window && Notification.permission === "granted" && status.savedToBackend) {
      console.log("[PushPrompt] granted + saved → no prompt");
      return;
    }

    // ── Platform unsupported ──
    if (!pushCap.canUsePush) {
      // Show iOS install hint only if not permanently dismissed
      if (localStorage.getItem(DISMISSED_KEY) === "true") return;
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }

    // ── Only show for prompt-ready state ──
    if (status.state !== "prompt-ready") {
      console.log("[PushPrompt] state=", status.state, "→ no prompt");
      return;
    }

    // ── Permanently dismissed by user ──
    if (localStorage.getItem(DISMISSED_KEY) === "true") {
      console.log("[PushPrompt] permanently dismissed → no prompt");
      return;
    }

    // ── Cooldown: don't ask more than once per 7 days ──
    const lastShown = localStorage.getItem(LAST_PROMPT_KEY);
    if (lastShown) {
      const elapsed = Date.now() - parseInt(lastShown, 10);
      if (elapsed < PROMPT_COOLDOWN_MS) {
        console.log("[PushPrompt] cooldown active (", Math.round(elapsed / 3600000), "h ago) → no prompt");
        return;
      }
    }

    console.log("[PushPrompt] Showing push activation prompt");
    localStorage.setItem(LAST_PROMPT_KEY, Date.now().toString());
    const timer = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(timer);
  }, [user, location.pathname, status.state, status.savedToBackend, status.initialCheckDone, pushCap.canUsePush]);

  const handleDismiss = useCallback(() => {
    // If unsupported (iOS browser), persist separately
    // For supported platforms, set permanent dismiss
    localStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
  }, []);

  const handleActivate = useCallback(async () => {
    setActivating(true);
    const ok = await subscribe();
    setActivating(false);
    if (ok) {
      setResult("success");
      // Clear dismissed flag since it's now active
      localStorage.removeItem(DISMISSED_KEY);
      setTimeout(() => setVisible(false), 2000);
    } else {
      // Check if it was denied
      if ("Notification" in window && Notification.permission === "denied") {
        setResult("denied");
        localStorage.setItem(DISMISSED_KEY, "true");
      } else {
        setResult("denied");
      }
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
                Du hast die Benachrichtigungs-Berechtigung abgelehnt. Du kannst sie in den Browser-Einstellungen wieder aktivieren.
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
