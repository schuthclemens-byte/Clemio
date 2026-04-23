// Edge Function: request-voice-consent
// Wrapper um die DB-RPC public.request_voice_consent.
// - Validiert Auth-Token
// - Ruft die SECURITY DEFINER RPC auf (führt alle Limit-/Block-/Trust-Checks aus)
// - Schickt Push NUR wenn die RPC should_send_push=true zurückgibt (Shadow-Limit greift)
// - Mappt DB-Fehler auf neutrale Client-Fehlercodes

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Map raw DB error messages to neutral client codes
function mapError(message: string): { code: string; status: number } {
  if (message.includes("rate_limited")) return { code: "rate_limited", status: 429 };
  if (message.includes("duplicate_request")) return { code: "duplicate_request", status: 409 };
  if (message.includes("cooldown_active")) return { code: "cooldown_active", status: 429 };
  if (message.includes("request_not_allowed")) return { code: "request_not_allowed", status: 403 };
  if (message.includes("invalid_request")) return { code: "invalid_request", status: 400 };
  if (message.includes("Not authenticated")) return { code: "unauthorized", status: 401 };
  return { code: "unknown_error", status: 500 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }

    // Parse + validate body
    let body: { voice_owner_id?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid_request" }, 400);
    }

    const voiceOwnerId = body?.voice_owner_id;
    if (
      !voiceOwnerId ||
      typeof voiceOwnerId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        voiceOwnerId,
      )
    ) {
      return json({ error: "invalid_request" }, 400);
    }

    // Client mit User-JWT → RPC läuft im User-Kontext (auth.uid() ist gesetzt)
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data, error } = await supabase.rpc("request_voice_consent", {
      _voice_owner_id: voiceOwnerId,
    });

    if (error) {
      console.log("[request-voice-consent] rpc error", error.message);
      const mapped = mapError(error.message);
      return json({ error: mapped.code }, mapped.status);
    }

    const result = data as { consent_id: string; should_send_push: boolean } | null;
    if (!result?.consent_id) {
      return json({ error: "unknown_error" }, 500);
    }

    // Shadow-Limit: Push unterdrücken
    if (!result.should_send_push) {
      console.log("[request-voice-consent] shadow-limited, skipping push", {
        consent_id: result.consent_id,
      });
      return json({ ok: true, consent_id: result.consent_id, shadowed: true });
    }

    // Sender-Name für Push (nur lesen, was RLS erlaubt)
    let senderName = "Jemand";
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, first_name")
          .eq("id", user.id)
          .maybeSingle();
        senderName =
          profile?.display_name || profile?.first_name || "Jemand";
      }
    } catch (e) {
      console.log("[request-voice-consent] could not load sender name", String(e));
    }

    // Push triggern (best-effort; Fehler dürfen die Anfrage nicht killen)
    try {
      const pushRes = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: voiceOwnerId,
          title: senderName,
          body: "möchte deine Stimme verwenden dürfen",
          data: {
            type: "voice_consent_request",
            consent_id: result.consent_id,
            sender_id: (await supabase.auth.getUser()).data.user?.id ?? null,
          },
        }),
      });
      // Body konsumieren, sonst Resource-Leak
      await pushRes.text();
    } catch (e) {
      console.log("[request-voice-consent] push failed", String(e));
    }

    return json({ ok: true, consent_id: result.consent_id, shadowed: false });
  } catch (err) {
    console.error("[request-voice-consent] fatal", String(err));
    return json({ error: "unknown_error" }, 500);
  }
});
