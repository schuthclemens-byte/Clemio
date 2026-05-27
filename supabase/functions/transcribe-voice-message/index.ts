// On-Demand persistente Sprachnachrichten-Transkription via RunPod Serverless.
// Lädt das Audio aus dem Storage-Bucket "stimmen", schickt es base64-kodiert an
// einen RunPod-Endpunkt (faster-whisper) und speichert das Transkript persistent
// in der messages-Tabelle.
//
// Sicherheitsprinzipien:
// - Nutzer-Auth wird im Code geprüft (verify_jwt=false als Default).
// - Nur der Besitzer (sender_id) der Nachricht darf transkribieren.
// - Fremde / unbekannte message_id liefert 403.
// - RunPod-Key wird ausschließlich serverseitig aus Secrets gelesen.
// - Audio-URLs, Audio-Bytes und Transkripte werden NIEMALS geloggt.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_DURATION_SEC = 120; // 2 Minuten
const RUNPOD_TIMEOUT_MS = 90_000; // 90 s hard timeout für runsync

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Wandelt einen ArrayBuffer ohne Stack-Overflow in base64 um.
function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
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

    // 2. Body validieren
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

    // 3. Service-Role-Client für DB + Storage
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

    // 5. Ownership: NUR der Sender darf transkribieren
    if (message.sender_id !== userId) {
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
      return json({ error: "Audio zu lang (max. 2 Minuten)" }, 413);
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

    // 10. RunPod-Secrets
    const RUNPOD_API_KEY = Deno.env.get("RUNPOD_API_KEY");
    const RUNPOD_STT_ENDPOINT_ID = Deno.env.get("RUNPOD_STT_ENDPOINT_ID");

    if (!RUNPOD_API_KEY || !RUNPOD_STT_ENDPOINT_ID) {
      await admin
        .from("messages")
        .update({ audio_transcript_status: "failed" })
        .eq("id", messageId);
      return json(
        { error: "Transkriptionsdienst ist nicht konfiguriert." },
        503,
      );
    }

    // 11. Storage-Pfad aus audio_url ableiten (akzeptiert vollen Public/Signed-URL oder Pfad)
    let audioPath = message.audio_url as string;
    const stimmenMarker = "/stimmen/";
    const idx = audioPath.indexOf(stimmenMarker);
    if (idx !== -1) audioPath = audioPath.substring(idx + stimmenMarker.length);
    const qIdx = audioPath.indexOf("?");
    if (qIdx !== -1) audioPath = audioPath.substring(0, qIdx);

    // 12. Audio aus Storage ziehen
    const { data: audioBlob, error: dlErr } = await admin.storage
      .from("stimmen")
      .download(audioPath);
    if (dlErr || !audioBlob) {
      console.error("[transcribe-voice-message] storage download failed");
      await admin
        .from("messages")
        .update({ audio_transcript_status: "failed" })
        .eq("id", messageId);
      return json({ error: "Audio nicht zugänglich" }, 500);
    }

    const audioBuf = await audioBlob.arrayBuffer();
    const audioBase64 = toBase64(audioBuf);

    // Filename ableiten (nur letzter Pfadteil, kein PII-Leak)
    const filenameFromPath = audioPath.split("/").pop() || "voice-message.wav";

    // 13. RunPod runsync aufrufen (mit Timeout)
    const runpodUrl = `https://api.runpod.ai/v2/${RUNPOD_STT_ENDPOINT_ID}/runsync`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RUNPOD_TIMEOUT_MS);

    let runpodRes: Response;
    try {
      runpodRes = await fetch(runpodUrl, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${RUNPOD_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            audio_base64: audioBase64,
            filename: filenameFromPath,
            language: null,
            task: "transcribe",
          },
        }),
      });
    } catch (e) {
      clearTimeout(timeoutId);
      const aborted = (e as Error)?.name === "AbortError";
      console.error(
        "[transcribe-voice-message] runpod fetch failed:",
        aborted ? "timeout" : (e as Error)?.message,
      );
      await admin
        .from("messages")
        .update({ audio_transcript_status: "failed" })
        .eq("id", messageId);
      return json(
        {
          error: aborted
            ? "Transkription hat zu lange gedauert."
            : "Transkriptionsserver nicht erreichbar.",
        },
        aborted ? 504 : 502,
      );
    }
    clearTimeout(timeoutId);

    if (!runpodRes.ok) {
      console.error(
        "[transcribe-voice-message] runpod http",
        runpodRes.status,
      );
      await runpodRes.text().catch(() => "");
      await admin
        .from("messages")
        .update({ audio_transcript_status: "failed" })
        .eq("id", messageId);
      return json({ error: "Transkription fehlgeschlagen" }, 502);
    }

    let runpodJson: {
      status?: string;
      output?: {
        ok?: boolean;
        text?: string;
        language?: string | null;
        error?: string;
      };
      error?: string;
    };
    try {
      runpodJson = await runpodRes.json();
    } catch {
      await admin
        .from("messages")
        .update({ audio_transcript_status: "failed" })
        .eq("id", messageId);
      return json({ error: "Ungültige Antwort vom Transkriptionsserver" }, 502);
    }

    const runpodStatus = (runpodJson?.status ?? "").toUpperCase();
    const output = runpodJson?.output;

    if (runpodStatus !== "COMPLETED" || !output || output.ok !== true) {
      console.error(
        "[transcribe-voice-message] runpod not completed:",
        runpodStatus,
      );
      await admin
        .from("messages")
        .update({ audio_transcript_status: "failed" })
        .eq("id", messageId);

      // Wenn RunPod selbst eine Fehlerbeschreibung mitliefert, an den Client
      // weiterreichen — sonst neutrale Meldung.
      const friendly =
        output?.error ||
        runpodJson?.error ||
        "Transkription fehlgeschlagen.";
      return json({ error: friendly }, 502);
    }

    const transcript = (output.text ?? "").trim();
    const language = output.language ?? null;

    if (!transcript) {
      await admin
        .from("messages")
        .update({ audio_transcript_status: "failed" })
        .eq("id", messageId);
      return json({ error: "Leeres Transkript" }, 422);
    }

    // 14. Ergebnis persistieren
    const { error: saveErr } = await admin
      .from("messages")
      .update({
        audio_transcript: transcript,
        audio_transcript_status: "completed",
        audio_transcript_language: language,
        audio_transcript_provider: "runpod_faster_whisper",
        audio_transcript_created_at: new Date().toISOString(),
      })
      .eq("id", messageId);

    if (saveErr) {
      console.error("[transcribe-voice-message] save failed");
      return json({ error: "Database error" }, 500);
    }

    return json({ status: "completed" }, 200);
  } catch (err) {
    console.error(
      "[transcribe-voice-message] unexpected",
      (err as Error)?.message,
    );
    return json({ error: "Internal server error" }, 500);
  }
});
