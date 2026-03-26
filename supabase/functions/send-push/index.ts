import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Base64url → Uint8Array (for VAPID key conversion)
function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (base64.length % 4)) % 4;
  const padded = base64 + "=".repeat(pad);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Build JWT for VAPID authorization
async function createVapidJwt(
  audience: string,
  subject: string,
  privateKeyBase64url: string
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 60 * 60 * 12, sub: subject };

  const enc = new TextEncoder();
  const toB64url = (buf: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(buf)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const headerB64 = toB64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = toB64url(enc.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import ECDSA private key
  const rawKey = base64urlToUint8Array(privateKeyBase64url);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    await buildPkcs8(rawKey),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    enc.encode(unsignedToken)
  );

  // Convert DER signature to raw r||s (64 bytes)
  const rawSig = derToRaw(new Uint8Array(sig));
  return `${unsignedToken}.${toB64url(rawSig.buffer as ArrayBuffer)}`;
}

// Wrap raw 32-byte EC private key into PKCS8 DER
async function buildPkcs8(rawKey: Uint8Array): Promise<ArrayBuffer> {
  // PKCS8 prefix for P-256
  const prefix = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86,
    0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02, 0x01, 0x01, 0x04, 0x20,
  ]);
  // suffix (empty public key)
  const suffix = new Uint8Array([
    0xa1, 0x44, 0x03, 0x42, 0x00, 0x04,
    // 64 bytes of zeros as placeholder – we only need signing, not the public part
    ...new Array(64).fill(0),
  ]);
  const result = new Uint8Array(prefix.length + rawKey.length + suffix.length);
  result.set(prefix);
  result.set(rawKey, prefix.length);
  result.set(suffix, prefix.length + rawKey.length);
  return result.buffer;
}

// Convert DER-encoded ECDSA signature to raw 64-byte format
function derToRaw(der: Uint8Array): Uint8Array {
  // Some implementations return raw 64 bytes already
  if (der.length === 64) return der;

  const raw = new Uint8Array(64);
  // DER: 0x30 <len> 0x02 <rLen> <r> 0x02 <sLen> <s>
  let offset = 2; // skip 0x30 <len>
  offset++; // skip 0x02
  const rLen = der[offset++];
  const rStart = offset;
  offset += rLen;
  offset++; // skip 0x02
  const sLen = der[offset++];
  const sStart = offset;

  // Copy r (right-aligned in 32 bytes)
  const rBytes = der.slice(rStart, rStart + rLen);
  raw.set(rBytes.length > 32 ? rBytes.slice(rBytes.length - 32) : rBytes, 32 - Math.min(rBytes.length, 32));
  // Copy s
  const sBytes = der.slice(sStart, sStart + sLen);
  raw.set(sBytes.length > 32 ? sBytes.slice(sBytes.length - 32) : sBytes, 64 - Math.min(sBytes.length, 32));

  return raw;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    const VAPID_PUBLIC_KEY =
      "BI5673858uhr-tH_qZ3fOR9YRnZWCMuZBdIPqI_QyMUXqCLhQXzaCOkjl_Jj-ld4j_7Vg90phsJt9VS3fv59idw";
    const VAPID_SUBJECT = "mailto:support@clevara.app";

    if (!VAPID_PRIVATE_KEY) {
      return new Response(
        JSON.stringify({ error: "VAPID_PRIVATE_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { user_id, title, body, data } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all push subscriptions for user
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (subError) {
      return new Response(
        JSON.stringify({ error: subError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No push subscriptions found for user", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title: title || "Clevara",
      body: body || "Neue Nachricht",
      data: data || {},
    });

    const results = [];

    for (const sub of subscriptions) {
      try {
        const endpoint = sub.endpoint;
        const endpointUrl = new URL(endpoint);
        const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

        const jwt = await createVapidJwt(audience, VAPID_SUBJECT, VAPID_PRIVATE_KEY);

        const pushRes = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aes128gcm",
            TTL: "86400",
            Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
          },
          body: new TextEncoder().encode(payload),
        });

        if (pushRes.status === 410 || pushRes.status === 404) {
          // Subscription expired, remove it
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
          results.push({ endpoint, status: "expired_removed" });
        } else if (!pushRes.ok) {
          const errText = await pushRes.text();
          results.push({ endpoint, status: "failed", code: pushRes.status, error: errText });
        } else {
          results.push({ endpoint, status: "sent" });
        }
      } catch (err) {
        results.push({ endpoint: sub.endpoint, status: "error", error: String(err) });
      }
    }

    return new Response(
      JSON.stringify({ sent: results.filter((r) => r.status === "sent").length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
