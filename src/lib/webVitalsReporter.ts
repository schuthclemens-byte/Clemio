import { onCLS, onFCP, onINP, onLCP, type Metric } from "web-vitals";
import { supabase } from "@/integrations/supabase/client";

const STATIC_PUBLIC_ROUTES = new Set<string>([
  "/",
  "/install",
  "/privacy",
  "/terms",
  "/impressum",
  "/login",
  "/onboarding",
]);

function normalizeRoute(pathname: string): string {
  if (!pathname) return "/";
  // Strip trailing slash except for root
  const trimmed = pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
  return trimmed;
}

function isPublicRoute(route: string): boolean {
  if (STATIC_PUBLIC_ROUTES.has(route)) return true;
  if (route.startsWith("/blog/")) return true;
  return false;
}

function detectDevice(): "mobile" | "tablet" | "desktop" | "unknown" {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "mobile";
  return "desktop";
}

const reportedIds = new Set<string>();

function buildSender(route: string) {
  const device = detectDevice();
  return async (metric: Metric) => {
    // Dedupe per metric.id (web-vitals re-fires updates; we want final value once per load)
    if (reportedIds.has(metric.id)) return;
    reportedIds.add(metric.id);

    try {
      await supabase.from("web_vitals_samples").insert({
        route,
        metric: metric.name,
        value: Math.round(metric.value * 1000) / 1000,
        rating: metric.rating,
        device,
        navigation_type: metric.navigationType ?? null,
      });
    } catch {
      // Silent: never disrupt the user experience for analytics
    }
  };
}

let initialized = false;

export function initWebVitalsReporter(): void {
  if (initialized) return;
  if (typeof window === "undefined") return;

  const route = normalizeRoute(window.location.pathname);
  if (!isPublicRoute(route)) return;

  initialized = true;
  const send = buildSender(route);

  // reportAllChanges: false → only final value per metric per page load
  onLCP(send);
  onCLS(send);
  onFCP(send);
  onINP(send);
}
