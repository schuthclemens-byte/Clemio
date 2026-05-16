// RevenueCat Webhook Receiver
// Docs: https://www.revenuecat.com/docs/integrations/webhooks
//
// Security model:
// - POST only
// - Authorization header MUST match Deno.env.get("REVENUECAT_WEBHOOK_AUTH")
// - app_user_id MUST be a valid Supabase auth UUID (set client-side via Purchases.logIn(auth.uid()))
// - Entitlement "premium" required to activate premium
// - Idempotent: revenuecat event id is stored with a UNIQUE index; duplicates return ok:true,duplicate:true
// - Sandbox events are logged but do NOT mutate production subscription rows
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_AUTH = Deno.env.get("REVENUECAT_WEBHOOK_AUTH") ?? "";

const REQUIRED_ENTITLEMENT = "premium";
const REQUIRED_PRODUCT_PREFIXES = ["clemio_premium"]; // accepts clemio_premium_monthly etc.

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type RCEvent = {
  id?: string;
  type: string;
  app_user_id: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  entitlement_id?: string | null;
  entitlement_ids?: string[] | null;
  store?: string;
  environment?: "SANDBOX" | "PRODUCTION";
  expiration_at_ms?: number | null;
  purchased_at_ms?: number | null;
  event_timestamp_ms?: number;
  original_transaction_id?: string;
  transaction_id?: string;
  period_type?: "TRIAL" | "NORMAL" | "INTRO";
  cancel_reason?: string | null;
};

function mapStore(store?: string): string | null {
  if (store === "APP_STORE") return "apple";
  if (store === "PLAY_STORE") return "google";
  if (store === "STRIPE") return "stripe";
  if (store === "PROMOTIONAL") return "promo";
  return store ? store.toLowerCase() : null;
}

function deriveStatus(ev: RCEvent): {
  premium_status: "premium" | "free" | "trial" | "expired" | "canceled";
  cancel_at_period_end: boolean;
  will_renew: boolean;
} {
  const isTrial = ev.period_type === "TRIAL";
  const expiresAt = ev.expiration_at_ms ?? 0;
  const active = expiresAt > Date.now();
  switch (ev.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "PRODUCT_CHANGE":
      return {
        premium_status: isTrial ? "trial" : "premium",
        cancel_at_period_end: false,
        will_renew: true,
      };
    case "CANCELLATION":
      return {
        premium_status: active ? (isTrial ? "trial" : "premium") : "canceled",
        cancel_at_period_end: true,
        will_renew: false,
      };
    case "EXPIRATION":
      return { premium_status: "expired", cancel_at_period_end: false, will_renew: false };
    case "REFUND":
      return { premium_status: "expired", cancel_at_period_end: false, will_renew: false };
    case "BILLING_ISSUE":
      return {
        premium_status: active ? "premium" : "expired",
        cancel_at_period_end: false,
        will_renew: true,
      };
    case "SUBSCRIPTION_PAUSED":
      return { premium_status: "canceled", cancel_at_period_end: false, will_renew: false };
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
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  // 1) Auth
  const auth = req.headers.get("authorization") ?? "";
  if (!WEBHOOK_AUTH) return json(503, { error: "webhook_not_configured" });
  // Allow either "<secret>" or "Bearer <secret>"
  const ok =
    timingSafeEqual(auth, WEBHOOK_AUTH) ||
    timingSafeEqual(auth, `Bearer ${WEBHOOK_AUTH}`);
  if (!ok) return json(401, { error: "unauthorized" });

  // 2) Body
  let payload: { event?: RCEvent; api_version?: string };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }
  const ev = payload?.event;
  if (!ev || !ev.type || !ev.app_user_id) {
    await admin.from("store_webhook_events").insert({
      provider: "revenuecat",
      payload,
      error: "missing_event_fields",
    });
    return json(400, { error: "invalid_event" });
  }

  // 3) Idempotency — try to claim the event first
  const eventId = ev.id ?? null;
  const appUserId = ev.app_user_id;
  const entitlementIds = ev.entitlement_ids ?? (ev.entitlement_id ? [ev.entitlement_id] : []);
  const entitlementId = entitlementIds.find((e) => e === REQUIRED_ENTITLEMENT) ?? entitlementIds[0] ?? null;
  const isSandbox = ev.environment === "SANDBOX";

  if (eventId) {
    const { error: insErr } = await admin.from("store_webhook_events").insert({
      provider: "revenuecat",
      revenuecat_event_id: eventId,
      event_type: ev.type,
      environment: ev.environment ?? null,
      app_user_id: appUserId,
      product_id: ev.product_id ?? null,
      entitlement_id: entitlementId,
      payload,
    });
    if (insErr) {
      // Unique violation => duplicate event, already processed
      if (insErr.code === "23505") {
        console.log(
          `dup event id=${eventId} type=${ev.type} env=${ev.environment ?? "?"}`,
        );
        return json(200, { ok: true, duplicate: true });
      }
      // Other insert error: log and continue (don't block processing)
      console.error("event log insert failed:", insErr.message);
    }
  } else {
    // No event id provided — log without idempotency guard
    await admin.from("store_webhook_events").insert({
      provider: "revenuecat",
      event_type: ev.type,
      environment: ev.environment ?? null,
      app_user_id: appUserId,
      product_id: ev.product_id ?? null,
      entitlement_id: entitlementId,
      payload,
    });
  }

  // 4) Validate user id and product
  const validUser = UUID_RE.test(appUserId);
  const validProduct =
    !!ev.product_id &&
    REQUIRED_PRODUCT_PREFIXES.some((p) => ev.product_id!.startsWith(p));
  const hasEntitlement = entitlementIds.includes(REQUIRED_ENTITLEMENT);

  console.log(
    `rc event type=${ev.type} user=${validUser ? appUserId : "INVALID"} product=${ev.product_id ?? "-"} ent=${entitlementId ?? "-"} env=${ev.environment ?? "-"}`,
  );

  if (!validUser) {
    await admin.from("admin_audit_log").insert({
      admin_user_id: null,
      actor_role: "system",
      source: "iap_webhook",
      action: `iap_webhook_${ev.type.toLowerCase()}_rejected`,
      target_resource: "subscriptions",
      success: false,
      error_message: "app_user_id is not a Supabase auth uuid",
      metadata: {
        provider: "revenuecat",
        app_user_id: appUserId,
        environment: ev.environment ?? null,
        product_id: ev.product_id ?? null,
      },
    });
    // Accept the webhook so RevenueCat does not retry forever, but do not mutate state
    return json(200, { ok: true, ignored: "invalid_app_user_id" });
  }

  // 5) Sandbox isolation — never overwrite production rows
  if (isSandbox) {
    await admin.from("admin_audit_log").insert({
      admin_user_id: null,
      actor_role: "system",
      source: "iap_webhook",
      action: `iap_webhook_${ev.type.toLowerCase()}_sandbox`,
      target_user_id: appUserId,
      target_resource: "subscriptions",
      success: true,
      metadata: {
        provider: "revenuecat",
        environment: "SANDBOX",
        product_id: ev.product_id ?? null,
        entitlement_ids: entitlementIds,
        event_id: eventId,
      },
    });
    return json(200, { ok: true, sandbox: true });
  }

  // 6) Derive subscription state
  const { premium_status, cancel_at_period_end, will_renew } = deriveStatus(ev);
  const periodEnd = ev.expiration_at_ms
    ? new Date(ev.expiration_at_ms).toISOString()
    : null;
  const provider = mapStore(ev.store);

  // Only ACTIVATE premium if the entitlement matches and product matches
  const wantsActivation =
    premium_status === "premium" || premium_status === "trial";
  const willActivate = wantsActivation && hasEntitlement && validProduct;

  const finalStatus: typeof premium_status = willActivate
    ? premium_status
    : wantsActivation
    ? "free"
    : premium_status;

  const update: Record<string, unknown> = {
    premium_status: finalStatus,
    premium_plan: ev.product_id ?? null,
    premium_current_period_end: periodEnd,
    current_period_end: periodEnd,
    cancel_at_period_end,
    iap_provider: provider,
    iap_product_id: ev.product_id ?? null,
    iap_environment: ev.environment?.toLowerCase() ?? "production",
    iap_revenuecat_app_user_id: appUserId,
    iap_original_transaction_id:
      ev.original_transaction_id ?? ev.transaction_id ?? null,
    iap_last_event_at: new Date().toISOString(),
    iap_will_renew: will_renew,
    subscription_provider: "revenuecat",
    subscription_status: finalStatus,
    updated_at: new Date().toISOString(),
  };

  if (finalStatus === "premium" || finalStatus === "trial") {
    update.premium_until = periodEnd;
    update.plan = "premium";
  } else if (finalStatus === "expired" || finalStatus === "canceled") {
    update.plan = "free";
  }

  // 7) Upsert subscription
  const { data: existing } = await admin
    .from("subscriptions")
    .select("id")
    .eq("user_id", appUserId)
    .maybeSingle();

  let dbError: string | null = null;
  if (existing) {
    const { error } = await admin
      .from("subscriptions")
      .update(update)
      .eq("user_id", appUserId);
    if (error) dbError = error.message;
  } else {
    const { error } = await admin.from("subscriptions").insert({
      user_id: appUserId,
      plan: finalStatus === "free" || finalStatus === "expired" || finalStatus === "canceled" ? "free" : "premium",
      ...update,
    });
    if (error) dbError = error.message;
  }

  // 8) Mark event processed
  if (eventId) {
    await admin
      .from("store_webhook_events")
      .update({ processed_at: new Date().toISOString(), error: dbError, normalized: update as any })
      .eq("revenuecat_event_id", eventId);
  }

  // 9) Audit
  const reqIp =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    null;
  await admin.from("admin_audit_log").insert({
    admin_user_id: null,
    actor_role: "system",
    source: "iap_webhook",
    ip_address: reqIp,
    user_agent: req.headers.get("user-agent"),
    request_id: req.headers.get("x-request-id") || req.headers.get("cf-ray"),
    action: `iap_webhook_${ev.type.toLowerCase()}`,
    target_user_id: appUserId,
    target_resource: "subscriptions",
    success: dbError === null,
    error_message: dbError,
    metadata: {
      provider: "revenuecat",
      store: ev.store ?? null,
      product_id: ev.product_id ?? null,
      entitlement_ids: entitlementIds,
      activated: willActivate,
      environment: ev.environment ?? "PRODUCTION",
      original_transaction_id:
        ev.original_transaction_id ?? ev.transaction_id ?? null,
      period_type: ev.period_type ?? null,
      expiration_at_ms: ev.expiration_at_ms ?? null,
      event_id: eventId,
      derived_status: finalStatus,
      will_renew,
      cancel_at_period_end,
    },
  });

  if (dbError) return json(500, { error: "internal_error" });
  return json(200, { ok: true });
});
