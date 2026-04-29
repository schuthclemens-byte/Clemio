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

const SENSITIVE_PATTERNS: Array<[RegExp, string]> = [
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]"],
  [/(\+?\d[\d\s().-]{6,}\d)/g, "[phone]"],
  [/\b(?:eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)\b/g, "[token]"],
  [/\b(?:api[_-]?key|apikey|token|secret|authorization|password)\s*[:=]\s*[^\s,;}]+/gi, "$1=[redacted]"],
];

const trim = (value: unknown, max = 2_000) => {
  const text = typeof value === "string" ? value : value == null ? "" : String(value);
  return text.slice(0, max);
};

const redact = (value: unknown, max = 2_000) => {
  let text = trim(value, max);
  for (const [pattern, replacement] of SENSITIVE_PATTERNS) {
    text = text.replace(pattern, replacement);
  }
  return text;
};

const safeDetails = (details?: Record<string, unknown>) => {
  if (!details) return {};
  const allowed = new Set(["filename", "lineno", "colno", "reasonType", "componentStack", "route", "source"]);
  return Object.fromEntries(
    Object.entries(details)
      .filter(([key]) => allowed.has(key))
      .map(([key, value]) => [key, typeof value === "number" || typeof value === "boolean" ? value : redact(value, 500)])
  );
};

const getRoute = () => (typeof window === "undefined" ? null : `${window.location.pathname}${window.location.search}`);
const getPlatform = () => (typeof navigator === "undefined" ? null : navigator.platform || null);
const getUserAgent = () => (typeof navigator === "undefined" ? null : navigator.userAgent.slice(0, 500));

const fingerprintFor = (input: AppErrorInput) =>
  [redact(input.title, 180), redact(input.message, 500), getRoute(), redact(input.stack?.split("\n")[0] ?? "", 500)]
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
      _title: redact(input.title, 180) || "Unbekannter Fehler",
      _message: redact(input.message || input.title, 2_000),
      _stack: input.stack ? redact(input.stack, 8_000) : null,
      _details: safeDetails(input.details),
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