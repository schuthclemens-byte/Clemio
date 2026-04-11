import { useState, useEffect, useCallback } from "react";
import { Bell, X, Smartphone } from "lucide-react";
import { usePushCapability } from "@/hooks/usePushCapability";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
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
  const { t } = useI18n();
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

    if (status.state === "active" || status.savedToBackend) return;
    if (status.state === "denied") return;
    if ("Notification" in window && Notification.permission === "denied") return;
    if ("Notification" in window && Notification.permission === "granted" && status.savedToBackend) return;

    if (!pushCap.canUsePush) {
      if (localStorage.getItem(DISMISSED_KEY) === "true") return;
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }

    if (status.state !== "prompt-ready") return;
    if (localStorage.getItem(DISMISSED_KEY) === "true") return;

    const lastShown = localStorage.getItem(LAST_PROMPT_KEY);
    if (lastShown) {
      const elapsed = Date.now() - parseInt(lastShown, 10);
      if (elapsed < PROMPT_COOLDOWN_MS) return;
    }

    localStorage.setItem(LAST_PROMPT_KEY, Date.now().toString());
    const timer = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(timer);
  }, [user, location.pathname, status.state, status.savedToBackend, status.initialCheckDone, pushCap.canUsePush]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
  }, []);

  const handleActivate = useCallback(async () => {
    setActivating(true);
    const ok = await subscribe();
    setActivating(false);
    if (ok) {
      setResult("success");
      localStorage.removeItem(DISMISSED_KEY);
      setTimeout(() => setVisible(false), 2000);
    } else {
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
          aria-label={t("push.close")}
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {!pushCap.canUsePush ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <Bell className="w-7 h-7 text-destructive" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-lg font-bold">{t("push.notSupported")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{pushCap.reason}</p>
            </div>
            {pushCap.isIOSBrowserOnly && (
              <button
                onClick={() => { handleDismiss(); navigate("/install"); }}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary/10 text-primary font-semibold text-sm transition-all active:scale-[0.97]"
              >
                <Smartphone className="w-4 h-4" />
                {t("push.addHome")}
              </button>
            )}
          </>
        ) : result === "success" ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Bell className="w-7 h-7 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold">{t("push.activated")}</h2>
              <p className="text-sm text-muted-foreground">{t("push.activatedDesc")}</p>
            </div>
          </>
        ) : result === "denied" ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <Bell className="w-7 h-7 text-destructive" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-lg font-bold">{t("push.denied")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("push.deniedDesc")}
              </p>
            </div>
            <button onClick={handleDismiss} className="w-full py-3 rounded-2xl bg-secondary text-foreground font-medium text-sm">
              {t("push.understood")}
            </button>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
              <Bell className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-lg font-bold">{t("push.enableTitle")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("push.enableDesc")}
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
              {activating ? t("push.activating") : t("push.activate")}
            </button>
            <button onClick={handleDismiss} className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("push.later")}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PushPromptSheet;
