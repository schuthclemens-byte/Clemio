import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Helpers ──────────────────────────────────────────────────────────

function base64urlToUint8Array(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (b64.length % 4)) % 4;
  const bin = atob(b64 + "=".repeat(pad));
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function uint8ToB64url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ── VAPID JWT (ES256) ────────────────────────────────────────────────

async function importVapidPrivateKey(rawB64url: string, publicKeyB64url: string): Promise<CryptoKey> {
  const pubBytes = base64urlToUint8Array(publicKeyB64url);
  const x = uint8ToB64url(pubBytes.slice(1, 33));
  const y = uint8ToB64url(pubBytes.slice(33, 65));

  const jwk = {
    kty: "EC",
    crv: "P-256",
    x,
    y,
    d: rawB64url,
    ext: true,
  };

  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

function derToRaw(der: Uint8Array): Uint8Array {
  if (der.length === 64) return der;
  const raw = new Uint8Array(64);
  let off = 2;
  off++;
  const rLen = der[off++];
  const rStart = off;
  off += rLen;
  off++;
  const sLen = der[off++];
  const sStart = off;
  const r = der.slice(rStart, rStart + rLen);
  raw.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
  const s = der.slice(sStart, sStart + sLen);
  raw.set(s.length > 32 ? s.slice(s.length - 32) : s, 64 - Math.min(s.length, 32));
  return raw;
}

async function createVapidJwt(audience: string, subject: string, privateKey: CryptoKey): Promise<string> {
  const enc = new TextEncoder();
  const toB64 = (buf: ArrayBuffer) => uint8ToB64url(new Uint8Array(buf));
  const header = toB64(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const now = Math.floor(Date.now() / 1000);
  const payload = toB64(enc.encode(JSON.stringify({ aud: audience, exp: now + 43200, sub: subject })));
  const unsigned = `${header}.${payload}`;
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, enc.encode(unsigned));
  return `${unsigned}.${toB64(derToRaw(new Uint8Array(sig)).buffer)}`;
}

// ── RFC 8291 Web Push Encryption (aes128gcm) ─────────────────────────

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const extractSalt = salt.length ? salt : new Uint8Array(32);
  const extractKey = await crypto.subtle.importKey("raw", extractSalt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", extractKey, ikm));
  const prkKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const infoLen = new Uint8Array([...info, 1]);
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, infoLen));
  return okm.slice(0, length);
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { result.set(a, offset); offset += a.length; }
  return result;
}

async function encryptPayload(
  p256dhB64: string,
  authB64: string,
  payload: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const enc = new TextEncoder();
  const clientPublicBytes = base64urlToUint8Array(p256dhB64);
  const clientAuth = base64urlToUint8Array(authB64);

  const clientPubKey = await crypto.subtle.importKey(
    "raw", clientPublicBytes, { name: "ECDH", namedCurve: "P-256" }, false, []
  );

  const localKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const localPublicKey = new Uint8Array(await crypto.subtle.exportKey("raw", localKeyPair.publicKey));

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: clientPubKey }, localKeyPair.privateKey, 256)
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const authInfo = concatBytes(enc.encode("WebPush: info\0"), clientPublicBytes, localPublicKey);
  const ikm = await hkdf(clientAuth, sharedSecret, authInfo, 32);

  const cekInfo = enc.encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = enc.encode("Content-Encoding: nonce\0");
  const cek = await hkdf(salt, ikm, cekInfo, 16);
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  const payloadBytes = enc.encode(payload);
  const padded = concatBytes(payloadBytes, new Uint8Array([2]));

  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, aesKey, padded)
  );

  return { encrypted: ciphertext, salt, localPublicKey };
}

function buildAes128gcmBody(salt: Uint8Array, localPublicKey: Uint8Array, ciphertext: Uint8Array): Uint8Array {
  const rs = 4096;
  const rsBytes = new Uint8Array(4);
  new DataView(rsBytes.buffer).setUint32(0, rs, false);
  const idLen = new Uint8Array([localPublicKey.length]);
  return concatBytes(salt, rsBytes, idLen, localPublicKey, ciphertext);
}

// ── FCM HTTP v1 API ──────────────────────────────────────────────────

/** Cache access token for ~55 minutes */
let fcmAccessTokenCache: { token: string; expiresAt: number } | null = null;

function base64urlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function createGoogleJwt(serviceAccount: { client_email: string; private_key: string; project_id: string }): Promise<string> {
  const enc = new TextEncoder();
  const now = Math.floor(Date.now() / 1000);

  const header = base64urlEncode(enc.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = base64urlEncode(enc.encode(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })));

  const unsigned = `${header}.${payload}`;

  // Import RSA private key (PEM -> PKCS8)
  const pemBody = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, enc.encode(unsigned));
  return `${unsigned}.${base64urlEncode(new Uint8Array(sig))}`;
}

async function getFcmAccessToken(serviceAccount: { client_email: string; private_key: string; project_id: string }): Promise<string> {
  const now = Date.now();
  if (fcmAccessTokenCache && fcmAccessTokenCache.expiresAt > now + 60_000) {
    return fcmAccessTokenCache.token;
  }

  const jwt = await createGoogleJwt(serviceAccount);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google OAuth failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  fcmAccessTokenCache = {
    token: data.access_token,
    expiresAt: now + (data.expires_in - 300) * 1000, // refresh 5 min early
  };

  return data.access_token;
}

async function sendFcmPush(
  fcmToken: string,
  title: string,
  body: string,
  pushData: Record<string, string>,
  serviceAccount: { client_email: string; private_key: string; project_id: string }
): Promise<{ status: string; code?: number; error?: string }> {
  try {
    const accessToken = await getFcmAccessToken(serviceAccount);

    const fcmPayload = {
      message: {
        token: fcmToken,
        notification: {
          title: title || "Neue Nachricht",
          body: body || "",
        },
        android: {
          priority: "high" as const,
          notification: {
            channel_id: "clemix_messages",
            icon: "ic_launcher",
            sound: "default",
          },
        },
        data: Object.fromEntries(
          Object.entries(pushData || {}).map(([k, v]) => [k, String(v)])
        ),
      },
    };

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fcmPayload),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      const isGone = /NOT_FOUND|UNREGISTERED/i.test(errText);
      return { status: isGone ? "expired" : "failed", code: res.status, error: errText };
    }

    await res.text(); // consume body
    return { status: "sent" };
  } catch (err) {
    return { status: "error", error: String(err) };
  }
}

// ── Main Handler ─────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth: only allow service_role or internal calls ──
    const authHeader = req.headers.get("authorization") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // Accept if: no auth header at all (internal db trigger via net.http_post)
    // OR if the bearer token matches the service role key
    // Reject if: bearer token is present but is NOT the service role key
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, "");
      // Reject anon key or any user JWT — only service_role allowed
      if (token !== serviceRoleKey) {
        return new Response(JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const VAPID_PRIVATE_KEY_B64 = Deno.env.get("VAPID_PRIVATE_KEY");
    const VAPID_PUBLIC_KEY = "BL2_0Ki93BHS5ty1Blv8Rxxw0FTgAJEBPq7TN6xk09czbSWSpnINsCBe46uv6LaiKbtkHlwmiiRSDifoFt5ZDVM";
    const VAPID_SUBJECT = "mailto:support@clemio.app";

    // Parse FCM service account (optional — graceful if not set)
    let fcmServiceAccount: { client_email: string; private_key: string; project_id: string } | null = null;
    const fcmKeyRaw = Deno.env.get("FCM_SERVICE_ACCOUNT_KEY");
    if (fcmKeyRaw) {
      try {
        fcmServiceAccount = JSON.parse(fcmKeyRaw);
      } catch {
        console.error("[send-push] FCM_SERVICE_ACCOUNT_KEY is not valid JSON");
      }
    }

    if (!VAPID_PRIVATE_KEY_B64) {
      return new Response(JSON.stringify({ error: "VAPID_PRIVATE_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const vapidPrivateKey = await importVapidPrivateKey(VAPID_PRIVATE_KEY_B64, VAPID_PUBLIC_KEY);
    const { user_id, title, body, data } = await req.json();
    console.log("[send-push] request", { user_id, title, hasData: !!data });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (subError) {
      return new Response(JSON.stringify({ error: subError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[send-push] no subscriptions", { user_id });
      return new Response(JSON.stringify({ error: "No push subscriptions", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("[send-push] subscriptions found", { user_id, count: subscriptions.length });

    const payload = JSON.stringify({
      title: title || "Neue Nachricht",
      body: body ?? "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: data || {},
    });

    const results = [];

    for (const sub of subscriptions) {
      const isFcm = sub.endpoint.startsWith("fcm://");

      if (isFcm) {
        // ── FCM (native Android) ──
        if (!fcmServiceAccount) {
          results.push({ endpoint: sub.endpoint, status: "skipped", error: "FCM not configured" });
          continue;
        }

        const fcmToken = sub.endpoint.replace("fcm://", "");
        const pushData: Record<string, string> = {};
        if (data?.conversation_id) pushData.conversation_id = data.conversation_id;
        if (data?.type) pushData.type = data.type;
        if (data?.call_id) pushData.call_id = data.call_id;
        if (data?.source) pushData.source = data.source;

        const result = await sendFcmPush(fcmToken, title, body, pushData, fcmServiceAccount);

        if (result.status === "expired") {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          results.push({ endpoint: sub.endpoint, status: "expired_removed", ...result });
        } else {
          results.push({ endpoint: sub.endpoint, ...result });
        }
      } else {
        // ── Web Push (VAPID) ──
        try {
          const endpoint = sub.endpoint;
          const endpointUrl = new URL(endpoint);
          const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

          const jwt = await createVapidJwt(audience, VAPID_SUBJECT, vapidPrivateKey);

          const { encrypted, salt, localPublicKey } = await encryptPayload(sub.p256dh, sub.auth, payload);
          const pushBody = buildAes128gcmBody(salt, localPublicKey, encrypted);

          const pushRes = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              "Content-Encoding": "aes128gcm",
              "Content-Length": String(pushBody.length),
              TTL: "86400",
              Urgency: "high",
              Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
            },
            body: pushBody,
          });

          const errText = pushRes.ok ? null : await pushRes.text();
          const isStaleVapidSubscription = !!errText && pushRes.status === 400 && /VapidPkHashMismatch|BadJwtToken|UnauthorizedRegistration/i.test(errText);

          if (pushRes.status === 410 || pushRes.status === 404 || isStaleVapidSubscription) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            results.push({
              endpoint,
              status: isStaleVapidSubscription ? "stale_removed" : "expired_removed",
              code: pushRes.status,
              error: errText,
            });
          } else if (!pushRes.ok) {
            results.push({ endpoint, status: "failed", code: pushRes.status, error: errText });
          } else {
            results.push({ endpoint, status: "sent" });
          }
        } catch (err) {
          results.push({ endpoint: sub.endpoint, status: "error", error: String(err) });
        }
      }
    }

    console.log("[send-push] result", { user_id, sent: results.filter((r) => r.status === "sent").length, results });

    return new Response(
      JSON.stringify({ sent: results.filter((r) => r.status === "sent").length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-push] fatal", String(err));
    return new Response(JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
