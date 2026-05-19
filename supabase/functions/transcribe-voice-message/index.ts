// On-Demand persistente Sprachnachrichten-Transkription (Stub).
// Ruft (später) einen selbst-gehosteten faster-whisper-Endpunkt auf.
// Solange SELF_HOSTED_STT_URL / SELF_HOSTED_STT_SECRET fehlen, antwortet die
// Funktion bewusst mit 503 und setzt den Status auf "failed".
//
// Sicherheitsprinzipien:
// - Nutzer-Auth wird im Code geprüft (verify_jwt=false als Default).
// - Audio-URLs und Transkripte werden NIEMALS geloggt.
// - Der STT-Server darf niemals direkt vom Frontend erreichbar sein.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_DURATION_SEC = 120; // 2 Minuten

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // 1. Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = userData.user.id;

    // 2. Body lesen + validieren
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const messageId: string | undefined = body?.message_id;
    if (!messageId || typeof messageId !== "string" || !UUID_RE.test(messageId)) {
      return json({ error: "Invalid message_id" }, 400);
    }

    // 3. Service-Role-Client für DB-Operationen (RLS bewusst umgehen,
    //    weil wir vorher explizit per RPC autorisieren).
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 4. Nachricht laden
    const { data: message, error: msgErr } = await admin
      .from("messages")
      .select(
        "id, conversation_id, sender_id, message_type, audio_url, audio_transcript_status, audio_duration_seconds",
      )
      .eq("id", messageId)
      .maybeSingle();

    if (msgErr) {
      console.error("[transcribe-voice-message] db error", msgErr.message);
      return json({ error: "Database error" }, 500);
    }
    if (!message) {
      // Identische Antwort wie "kein Zugriff" → keine Enumeration
      return json({ error: "Forbidden" }, 403);
    }

    // 5. Berechtigung prüfen (Mitglied der Konversation?)
    const { data: isMember, error: memberErr } = await admin.rpc(
      "is_conversation_member",
      { _conversation_id: message.conversation_id, _user_id: userId },
    );
    if (memberErr || isMember !== true) {
      return json({ error: "Forbidden" }, 403);
    }

    // 6. Typ + Datei prüfen
    if (message.message_type !== "audio" || !message.audio_url) {
      return json({ error: "Message is not a voice message" }, 400);
    }

    // 7. Dauer-Limit (falls bekannt)
    if (
      typeof message.audio_duration_seconds === "number" &&
      message.audio_duration_seconds > MAX_DURATION_SEC
    ) {
      return json(
        { error: "Audio zu lang (max. 2 Minuten)" },
        413,
      );
    }

    // 8. Idempotenz
    const status = message.audio_transcript_status ?? "none";
    if (status === "processing") {
      return json({ status: "processing" }, 409);
    }
    if (status === "completed") {
      return json({ status: "completed" }, 409);
    }

    // 9. Status -> processing
    {
      const { error } = await admin
        .from("messages")
        .update({ audio_transcript_status: "processing" })
        .eq("id", messageId);
      if (error) {
        console.error("[transcribe-voice-message] status->processing failed");
        return json({ error: "Database error" }, 500);
      }
    }

    // 10. STT-Secrets prüfen
    const STT_URL = Deno.env.get("SELF_HOSTED_STT_URL");
    const STT_SECRET = Deno.env.get("SELF_HOSTED_STT_SECRET");

    if (!STT_URL || !STT_SECRET) {
      await admin
        .from("messages")
        .update({ audio_transcript_status: "failed" })
        .eq("id", messageId);

      return json(
        { error: "Transkriptionsserver ist noch nicht verbunden." },
        503,
      );
    }

    // 11. (Platzhalter) – Späterer Aufruf des Hetzner-STT-Servers:
    //
    //   const sttRes = await fetch(STT_URL, {
    //     method: "POST",
    //     headers: { Authorization: `Bearer ${STT_SECRET}` },
    //     body: ... signed URL oder Multipart ...
    //   });
    //   ...dann Status -> completed, audio_transcript, language, created_at setzen.
    //
    // In diesem Schritt explizit nicht implementiert.

    await admin
      .from("messages")
      .update({ audio_transcript_status: "failed" })
      .eq("id", messageId);

    return json(
      { error: "Transkriptionsserver ist noch nicht verbunden." },
      503,
    );
  } catch (err) {
    console.error("[transcribe-voice-message] unexpected", (err as Error)?.message);
    return json({ error: "Internal server error" }, 500);
  }
});
