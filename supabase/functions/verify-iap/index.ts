// RevenueCat Webhook Receiver
// Docs: https://www.revenuecat.com/docs/integrations/webhooks
// Configure in RevenueCat Dashboard:
//   URL:  https://<project-ref>.supabase.co/functions/v1/verify-iap
//   Auth header: "Authorization: Bearer <REVENUECAT_WEBHOOK_AUTH>"
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_AUTH = Deno.env.get("REVENUECAT_WEBHOOK_AUTH") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

type RCEvent = {
  type: string;
  app_user_id: string;
  original_app_user_id?: string;
  product_id?: string;
  store?: "APP_STORE" | "PLAY_STORE" | "STRIPE" | "PROMOTIONAL" | string;
  environment?: "SANDBOX" | "PRODUCTION";
  expiration_at_ms?: number | null;
  purchased_at_ms?: number | null;
  event_timestamp_ms?: number;
  original_transaction_id?: string;
  transaction_id?: string;
  period_type?: "TRIAL" | "NORMAL" | "INTRO";
  cancel_reason?: string | null;
};

function mapStoreToProvider(store?: string): string | null {
  if (store === "APP_STORE") return "apple";
  if (store === "PLAY_STORE") return "google";
  if (store === "STRIPE") return "stripe";
  if (store === "PROMOTIONAL") return "promo";
  return store ? store.toLowerCase() : null;
}

function deriveStatus(ev: RCEvent): {
  premium_status: "premium" | "free" | "trialing" | "grace";
  cancel_at_period_end: boolean;
  will_renew: boolean;
} {
  const t = ev.type;
  const isTrial = ev.period_type === "TRIAL";
  const expiresAt = ev.expiration_at_ms ?? 0;
  const active = expiresAt > Date.now();

  switch (t) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "PRODUCT_CHANGE":
      return {
        premium_status: isTrial ? "trialing" : "premium",
        cancel_at_period_end: false,
        will_renew: true,
      };
    case "CANCELLATION":
      return {
        premium_status: active ? (isTrial ? "trialing" : "premium") : "free",
        cancel_at_period_end: true,
        will_renew: false,
      };
    case "EXPIRATION":
      return {
        premium_status: "free",
        cancel_at_period_end: false,
        will_renew: false,
      };
    case "BILLING_ISSUE":
      return {
        premium_status: active ? "grace" : "free",
        cancel_at_period_end: false,
        will_renew: true,
      };
    case "SUBSCRIPTION_PAUSED":
      return {
        premium_status: "free",
        cancel_at_period_end: false,
        will_renew: false,
      };
    default:
      return {
        premium_status: active ? "premium" : "free",
        cancel_at_period_end: false,
        will_renew: active,
      };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // 1. Auth check
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${WEBHOOK_AUTH}`;
  if (!WEBHOOK_AUTH || !timingSafeEqual(auth, expected)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2. Parse body
  let payload: { event?: RCEvent; api_version?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ev = payload.event;
  if (!ev || !ev.type || !ev.app_user_id) {
    await admin.from("store_webhook_events").insert({
      provider: "revenuecat",
      payload,
      error: "missing_event_fields",
    });
    return new Response(JSON.stringify({ error: "invalid_event" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 3. Resolve user_id (RevenueCat app_user_id MUST be set to Supabase auth user id by client)
  const appUserId = ev.app_user_id;
  const userId = appUserId; // we set it client-side to auth.user.id

  const provider = mapStoreToProvider(ev.store);
  const { premium_status, cancel_at_period_end, will_renew } = deriveStatus(ev);
  const periodEnd = ev.expiration_at_ms ? new Date(ev.expiration_at_ms).toISOString() : null;

  const update: Record<string, unknown> = {
    premium_status,
    premium_plan: ev.product_id ?? null,
    premium_current_period_end: periodEnd,
    current_period_end: periodEnd,
    cancel_at_period_end,
    iap_provider: provider,
    iap_product_id: ev.product_id ?? null,
    iap_environment: ev.environment?.toLowerCase() ?? null,
    iap_revenuecat_app_user_id: appUserId,
    iap_original_transaction_id: ev.original_transaction_id ?? ev.transaction_id ?? null,
    iap_last_event_at: new Date().toISOString(),
    iap_will_renew: will_renew,
    subscription_provider: "revenuecat",
    subscription_status: premium_status,
    updated_at: new Date().toISOString(),
  };

  // 4. Try update existing subscription, else insert
  const { data: existing } = await admin
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  let dbError: string | null = null;
  if (existing) {
    const { error } = await admin
      .from("subscriptions")
      .update(update)
      .eq("user_id", userId);
    if (error) dbError = error.message;
  } else {
    const { error } = await admin.from("subscriptions").insert({
      user_id: userId,
      plan: premium_status === "free" ? "free" : "premium",
      ...update,
    });
    if (error) dbError = error.message;
  }

  // 5. Log event for audit
  await admin.from("store_webhook_events").insert({
    provider: "revenuecat",
    payload,
    normalized: { user_id: userId, ...update },
    error: dbError,
  });

  // 5b. Admin audit trail for IAP webhook (system actor → admin_user_id NULL)
  const reqIp =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    null;
  const reqUa = req.headers.get("user-agent");
  const reqId = req.headers.get("x-request-id") || req.headers.get("cf-ray");

  await admin.from("admin_audit_log").insert({
    admin_user_id: null,
    actor_role: "system",
    source: "iap_webhook",
    ip_address: reqIp,
    user_agent: reqUa,
    request_id: reqId,
    action: `iap_webhook_${ev.type.toLowerCase()}`,
    target_user_id: userId,
    target_resource: "subscriptions",
    success: dbError === null,
    error_message: dbError,
    metadata: {
      provider: "revenuecat",
      store: ev.store ?? null,
      product_id: ev.product_id ?? null,
      environment: ev.environment ?? null,
      original_transaction_id: ev.original_transaction_id ?? ev.transaction_id ?? null,
      period_type: ev.period_type ?? null,
      expiration_at_ms: ev.expiration_at_ms ?? null,
      event_timestamp_ms: ev.event_timestamp_ms ?? Date.now(),
      derived_status: premium_status,
      will_renew,
      cancel_at_period_end,
    },
  });

  if (dbError) {
    return new Response(JSON.stringify({ error: dbError }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
