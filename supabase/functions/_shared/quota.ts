// Quota helper used by all edge functions that consume billable resources.
// Calls the SECURITY DEFINER RPC `check_and_consume_quota` with the service role key.
// Returns:
//   { ok: true, used, limit, plan } on success
//   { ok: false, status, error, metric, limit, used } on quota exceeded or other failure

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

export type QuotaMetric =
  | "voice_listen"
  | "ki_improve"
  | "translate"
  | "stt_seconds"
  | "tts_seconds"
  | "voice_retrain";

export interface QuotaSuccess {
  ok: true;
  used: number;
  limit: number;
  plan: string;
}

export interface QuotaFailure {
  ok: false;
  status: number;
  error: string;
  metric: QuotaMetric;
  used?: number;
  limit?: number;
}

let _admin: ReturnType<typeof createClient> | null = null;
function admin() {
  if (_admin) return _admin;
  _admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );
  return _admin;
}

export async function consumeQuota(
  userId: string,
  metric: QuotaMetric,
  amount = 1
): Promise<QuotaSuccess | QuotaFailure> {
  if (!userId) {
    return { ok: false, status: 401, error: "no_user", metric };
  }
  if (amount <= 0) {
    return { ok: true, used: 0, limit: 0, plan: "unknown" };
  }

  try {
    const { data, error } = await admin().rpc("check_and_consume_quota", {
      _user_id: userId,
      _metric: metric,
      _amount: amount,
    });

    if (error) {
      const msg = String(error.message || "");
      // Format from RPC: "quota_exceeded:<metric>:<used>:<limit>"
      const match = msg.match(/quota_exceeded:([^:]+):(\d+):(\d+)/);
      if (match) {
        return {
          ok: false,
          status: 429,
          error: "quota_exceeded",
          metric,
          used: Number(match[2]),
          limit: Number(match[3]),
        };
      }
      console.error("[quota] RPC error", metric, msg);
      return { ok: false, status: 500, error: "quota_check_failed", metric };
    }

    const d = data as { used: number; limit: number; plan: string };
    return { ok: true, used: d.used, limit: d.limit, plan: d.plan };
  } catch (e) {
    console.error("[quota] unexpected", e);
    return { ok: false, status: 500, error: "quota_unexpected", metric };
  }
}

export function quotaErrorResponse(
  failure: QuotaFailure,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: failure.error,
      metric: failure.metric,
      used: failure.used ?? null,
      limit: failure.limit ?? null,
      message:
        failure.error === "quota_exceeded"
          ? `Du hast dein Monatslimit erreicht (${failure.used}/${failure.limit}). Premium gibt dir mehr.`
          : "Limit-Prüfung fehlgeschlagen, bitte später erneut versuchen.",
    }),
    {
      status: failure.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
