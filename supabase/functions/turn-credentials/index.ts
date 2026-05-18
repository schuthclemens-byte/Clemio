import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TTL_SECONDS = 3600;

async function hmacSha1Base64(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return base64Encode(new Uint8Array(sig));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate the user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Time-limited HMAC-SHA1 ephemeral credentials (RFC TURN REST API).
  // Requires the TURN server to be configured with `use-auth-secret` and `static-auth-secret = TURN_SECRET`.
  // Static credential fallback was removed for security: long-lived creds could be captured and reused indefinitely.
  const turnSecret = Deno.env.get("TURN_SECRET");
  const turnHost = Deno.env.get("TURN_HOST"); // e.g. "a.relay.metered.ca"

  if (!turnSecret) {
    return new Response(JSON.stringify({ error: "TURN credentials not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const expiry = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const username = `${expiry}:${user.id}`;
  const credential = await hmacSha1Base64(turnSecret, username);

  const host = turnHost ?? "a.relay.metered.ca";
  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: `turn:${host}:80`, username, credential },
    { urls: `turn:${host}:80?transport=tcp`, username, credential },
    { urls: `turn:${host}:443`, username, credential },
    { urls: `turns:${host}:443?transport=tcp`, username, credential },
  ];

  return new Response(
    JSON.stringify({ iceServers, ttl: TTL_SECONDS }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
