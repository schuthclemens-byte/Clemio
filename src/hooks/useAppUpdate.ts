import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Current app version – bump this on each release */
export const APP_VERSION = "1.0.0";

interface UpdateInfo {
  available: boolean;
  forceUpdate: boolean;
  latestVersion: string;
  changelog: string | null;
  storeUrl: string | null;
}

const DISMISSED_KEY = "clemio_update_dismissed";
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Compare two semver strings.
 * Returns 1 if a > b, -1 if a < b, 0 if equal.
 */
function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

function getPlatform(): string {
  const w = window as any;
  if (w.Capacitor?.getPlatform) {
    const p = w.Capacitor.getPlatform();
    if (p === "android" || p === "ios") return p;
  }
  return "web";
}

/** Try to read the native app version via Capacitor App plugin */
async function getNativeVersion(): Promise<string> {
  try {
    const w = window as any;
    if (w.Capacitor?.getPlatform && w.Capacitor.getPlatform() !== "web") {
      const { App } = await import("@capacitor/app");
      const info = await App.getInfo();
      return info.version; // e.g. "1.0.0"
    }
  } catch {
    // Not running in native context
  }
  return APP_VERSION;
}

export const useAppUpdate = () => {
  const { user } = useAuth();
  const [currentVersion, setCurrentVersion] = useState(APP_VERSION);
  const [update, setUpdate] = useState<UpdateInfo>({
    available: false,
    forceUpdate: false,
    latestVersion: APP_VERSION,
    changelog: null,
    storeUrl: null,
  });
  const [dismissed, setDismissed] = useState(false);

  // Read native version on mount
  useEffect(() => {
    getNativeVersion().then(setCurrentVersion);
  }, []);

  const checkForUpdate = useCallback(async () => {
    if (!user) return;

    const platform = getPlatform();

    const { data, error } = await supabase
      .from("app_versions")
      .select("*")
      .eq("platform", platform)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return;

    const isNewer = compareSemver(data.version, currentVersion) > 0;

    setUpdate({
      available: isNewer,
      forceUpdate: isNewer && !!data.force_update,
      latestVersion: data.version,
      changelog: data.changelog ?? null,
      storeUrl: data.store_url ?? null,
    });

    if (isNewer && data.force_update) {
      setDismissed(false);
    }
  }, [user, currentVersion]);

  useEffect(() => {
    checkForUpdate();
    const interval = setInterval(checkForUpdate, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkForUpdate]);

  useEffect(() => {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (raw) {
      const ts = parseInt(raw, 10);
      if (Date.now() - ts < DISMISS_COOLDOWN_MS) {
        setDismissed(true);
      } else {
        localStorage.removeItem(DISMISSED_KEY);
      }
    }
  }, []);

  const dismiss = useCallback(() => {
    if (update.forceUpdate) return;
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  }, [update.forceUpdate]);

  const openStore = useCallback(() => {
    if (update.storeUrl) {
      window.open(update.storeUrl, "_blank");
    }
  }, [update.storeUrl]);

  const showBanner = update.available && (!dismissed || update.forceUpdate);

  return {
    ...update,
    currentVersion,
    showBanner,
    dismiss,
    openStore,
    checkForUpdate,
  };
};
