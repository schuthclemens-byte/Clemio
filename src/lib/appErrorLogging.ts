type AppErrorSeverity = "warning" | "error" | "fatal";

interface AppErrorInput {
  title: string;
  message?: string;
  stack?: string | null;
  severity?: AppErrorSeverity;
  details?: Record<string, unknown>;
}

const recentFingerprints = new Map<string, number>();
const DEDUPE_MS = 30_000;
let loggingInFlight = false;

const trim = (value: unknown, max = 2_000) => {
  const text = typeof value === "string" ? value : value == null ? "" : String(value);
  return text.slice(0, max);
};

const getRoute = () => (typeof window === "undefined" ? null : `${window.location.pathname}${window.location.search}`);
const getPlatform = () => (typeof navigator === "undefined" ? null : navigator.platform || null);
const getUserAgent = () => (typeof navigator === "undefined" ? null : navigator.userAgent.slice(0, 500));

const fingerprintFor = (input: AppErrorInput) =>
  [input.title, input.message, getRoute(), input.stack?.split("\n")[0] ?? ""]
    .join("|")
    .slice(0, 500);

export const resetAppErrorLoggingForTests = () => {
  recentFingerprints.clear();
  loggingInFlight = false;
};

export async function logAppError(input: AppErrorInput) {
  if (loggingInFlight) return;

  const fingerprint = fingerprintFor(input);
  const now = Date.now();
  const lastSeen = recentFingerprints.get(fingerprint) ?? 0;
  if (now - lastSeen < DEDUPE_MS) return;
  recentFingerprints.set(fingerprint, now);

  loggingInFlight = true;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return;

    await (supabase as any).rpc("log_app_error_report", {
      _title: trim(input.title, 180) || "Unbekannter Fehler",
      _message: trim(input.message || input.title, 2_000),
      _stack: input.stack ? trim(input.stack, 8_000) : null,
      _details: input.details ?? {},
      _route: getRoute(),
      _user_agent: getUserAgent(),
      _platform: getPlatform(),
      _severity: input.severity ?? "error",
      _fingerprint: fingerprint,
    });
  } catch (error) {
    console.warn("[AppErrorLogging] failed:", error);
  } finally {
    loggingInFlight = false;
  }
}

const errorFromUnknown = (reason: unknown) => {
  if (reason instanceof Error) return reason;
  return new Error(trim(reason, 1_000) || "Unhandled rejection");
};

export function installGlobalErrorLogging() {
  const onError = (event: ErrorEvent) => {
    void logAppError({
      title: "Globaler App-Fehler",
      message: event.message,
      stack: event.error instanceof Error ? event.error.stack : null,
      severity: "error",
      details: { filename: event.filename, lineno: event.lineno, colno: event.colno },
    });
  };

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = errorFromUnknown(event.reason);
    void logAppError({
      title: "Nicht behandelte App-Aktion",
      message: error.message,
      stack: error.stack,
      severity: "error",
      details: { reasonType: typeof event.reason },
    });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
  };
}