// Apple App Store Server Notifications V2 + Google Play Real-time Developer Notifications
// Stub endpoint that authenticates the source, logs the event, and forwards
// status changes (renewed, cancelled, expired, refunded) to the subscriptions table.
// Real signature verification (Apple JWS / Google Pub/Sub) will be added when
// the App Store Connect / Play Console accounts are connected.
//
// Routes:
//   POST /store-webhooks/apple   – signedPayload from Apple
//   POST /store-webhooks/google  – Pub/Sub push message from Google Play
//
// All requests are recorded in the `store_webhook_events` audit table for
// debugging during integration. Mapping logic is intentionally minimal here.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

interface NormalizedEvent {
  provider: "apple" | "google";
  external_id: string | null;
  user_id: string | null;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  raw: unknown;
}

async function logEvent(provider: string, payload: unknown, normalized: NormalizedEvent | null, error?: string) {
  await admin.from("store_webhook_events" as any).insert({
    provider,
    payload: payload as any,
    normalized: normalized as any,
    error: error ?? null,
  } as any);
}

async function applyToSubscription(ev: NormalizedEvent) {
  if (!ev.user_id) return; // Cannot map without a user
  const patch: Record<string, unknown> = {
    subscription_provider: ev.provider,
    subscription_status: ev.status,
    current_period_end: ev.current_period_end,
    cancel_at_period_end: ev.cancel_at_period_end,
  };
  if (ev.status === "active" && ev.current_period_end) {
    patch.premium_until = ev.current_period_end;
    patch.plan = "premium";
  }
  if (ev.status === "expired" || ev.status === "cancelled") {
    patch.plan = "free";
  }
  await admin.from("subscriptions").update(patch).eq("user_id", ev.user_id);
}

function parseApple(body: any): NormalizedEvent {
  // TODO: verify Apple JWS signedPayload using App Store public keys.
  return {
    provider: "apple",
    external_id: body?.notificationUUID ?? null,
    user_id: null, // resolved later via appAccountToken once mapping is set up
    status: String(body?.notificationType || "unknown").toLowerCase(),
    current_period_end: null,
    cancel_at_period_end: false,
    raw: body,
  };
}

function parseGoogle(body: any): NormalizedEvent {
  // Pub/Sub envelope: { message: { data: base64 } }
  let data: any = body;
  try {
    if (body?.message?.data) {
      data = JSON.parse(atob(body.message.data));
    }
  } catch { /* ignore */ }
  const sub = data?.subscriptionNotification ?? data?.voidedPurchaseNotification;
  return {
    provider: "google",
    external_id: sub?.purchaseToken ?? null,
    user_id: null, // resolved later via obfuscatedAccountId
    status: sub?.notificationType ? `gpa_${sub.notificationType}` : "unknown",
    current_period_end: null,
    cancel_at_period_end: false,
    raw: data,
  };
}

// Shared-secret gate. Until full Apple JWS / Google OIDC verification is wired
// up, only callers presenting the configured secret may POST events. This
// prevents anonymous pollution of the audit table and blocks forged events.
const WEBHOOK_SHARED_SECRET = Deno.env.get("STORE_WEBHOOK_SHARED_SECRET") ?? "";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Reject all traffic until the shared secret is configured AND presented.
  if (!WEBHOOK_SHARED_SECRET) {
    return new Response("Webhook not configured", { status: 503, headers: corsHeaders });
  }
  const presented = req.headers.get("x-webhook-secret") ?? "";
  if (!timingSafeEqual(presented, WEBHOOK_SHARED_SECRET)) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop() || "";

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  let normalized: NormalizedEvent | null = null;
  try {
    if (path === "apple") normalized = parseApple(body);
    else if (path === "google") normalized = parseGoogle(body);
    else {
      return new Response("Unknown provider", { status: 404, headers: corsHeaders });
    }

    await logEvent(normalized.provider, body, normalized);
    if (normalized.user_id) {
      await applyToSubscription(normalized);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    await logEvent(path, body, normalized, String((e as Error).message));
    return new Response("Internal", { status: 500, headers: corsHeaders });
  }
});
