type AppErrorSeverity = "warning" | "error" | "fatal";
type AppErrorCategory = "ui" | "api" | "realtime" | "storage" | "auth" | "push" | "voice" | "unknown";

interface AppErrorInput {
  title: string;
  message?: string;
  stack?: string | null;
  severity?: AppErrorSeverity;
  category?: AppErrorCategory;
  details?: Record<string, unknown>;
}

const recentFingerprints = new Map<string, number>();
const DEDUPE_MS = 30 * 60_000;
const DEDUPE_STORAGE_KEY = "clemio_error_fingerprints_v1";
const MAX_STORED_FINGERPRINTS = 80;
let loggingInFlight = false;
let originalConsoleError: typeof console.error | null = null;

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

const inferCategory = (input: AppErrorInput): AppErrorCategory => {
  if (input.category) return input.category;
  const text = `${input.title} ${input.message ?? ""} ${input.stack ?? ""} ${getRoute() ?? ""}`.toLowerCase();
  if (/storage|bucket|upload|download|signed url|object/.test(text)) return "storage";
  if (/realtime|channel|presence|broadcast|postgres_changes|websocket/.test(text)) return "realtime";
  if (/auth|login|logout|session|jwt|token|password|sign.?in|sign.?up/.test(text)) return "auth";
  if (/push|notification|fcm|vapid|service worker/.test(text)) return "push";
  if (/voice|audio|tts|transcri|elevenlabs|microphone|recorder/.test(text)) return "voice";
  if (/api|rpc|function|fetch|network|request|response|http|edge/.test(text)) return "api";
  return "ui";
};

const normalizeForFingerprint = (value: unknown, max = 500) =>
  redact(value, max)
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[uuid]")
    .replace(/:\d+:\d+/g, ":[line]:[col]")
    .replace(/\?t=\d+/g, "?t=[ts]");

const getStoredFingerprints = (): Record<string, number> => {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(DEDUPE_STORAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
};

const rememberFingerprint = (fingerprint: string, now: number) => {
  recentFingerprints.set(fingerprint, now);
  if (typeof localStorage === "undefined") return;

  const stored = getStoredFingerprints();
  stored[fingerprint] = now;
  const pruned = Object.fromEntries(
    Object.entries(stored)
      .filter(([, seenAt]) => now - seenAt < DEDUPE_MS)
      .sort(([, a], [, b]) => b - a)
      .slice(0, MAX_STORED_FINGERPRINTS)
  );
  try {
    localStorage.setItem(DEDUPE_STORAGE_KEY, JSON.stringify(pruned));
  } catch {
    // Ignore storage limits; in-memory dedupe still works for this session.
  }
};

const wasRecentlyLogged = (fingerprint: string, now: number) => {
  const memorySeen = recentFingerprints.get(fingerprint) ?? 0;
  const storageSeen = getStoredFingerprints()[fingerprint] ?? 0;
  return now - Math.max(memorySeen, storageSeen) < DEDUPE_MS;
};

const fingerprintFor = (input: AppErrorInput) =>
  [normalizeForFingerprint(input.title, 180), normalizeForFingerprint(input.message, 500), getRoute(), normalizeForFingerprint(input.stack?.split("\n")[0] ?? "", 500)]
    .join("|")
    .slice(0, 500);

export const resetAppErrorLoggingForTests = () => {
  recentFingerprints.clear();
  localStorage.removeItem(DEDUPE_STORAGE_KEY);
  loggingInFlight = false;
};

export async function logAppError(input: AppErrorInput) {
  if (loggingInFlight) return;

  const fingerprint = fingerprintFor(input);
  const now = Date.now();
  if (wasRecentlyLogged(fingerprint, now)) return;
  rememberFingerprint(fingerprint, now);

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
      _dedupe_window_seconds: Math.round(DEDUPE_MS / 1000),
      _category: inferCategory(input),
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

const formatConsoleArgument = (value: unknown) => {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const installConsoleErrorLogging = () => {
  if (originalConsoleError) return () => undefined;

  originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    originalConsoleError?.(...args);

    const message = args.map(formatConsoleArgument).filter(Boolean).join(" ").trim();
    const stack = args.find((arg): arg is Error => arg instanceof Error)?.stack ?? new Error().stack;

    void logAppError({
      title: "Konsolen-Fehler",
      message: message || "Unbekannter Konsolen-Fehler",
      stack,
      severity: "error",
      details: { source: "console.error" },
    });
  };

  return () => {
    if (originalConsoleError) {
      console.error = originalConsoleError;
      originalConsoleError = null;
    }
  };
};

export function installGlobalErrorLogging() {
  const cleanupConsoleError = installConsoleErrorLogging();

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
    cleanupConsoleError();
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
  };
}