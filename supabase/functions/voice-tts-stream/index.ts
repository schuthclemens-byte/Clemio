import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { consumeQuota, quotaErrorResponse } from "../_shared/quota.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Deterministic cache key from voiceId + text */
async function cacheKey(voiceId: string, text: string): Promise<string> {
  const data = new TextEncoder().encode(`${voiceId}::${text}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hex = [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 16)}.mp3`;
}

function errorResponse(status: number, error: string, code?: string) {
  return new Response(JSON.stringify({ error, ...(code ? { code } : {}) }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const DEFAULT_VOICE_IDS = new Set([
  "CwhRBWXzGAHq8TQ4Fs17", "EXAVITQu4vr4xnSDxMaL", "FGY2WhTYpPnrIDTdsKH5",
  "IKne3meq5aSn9XLyUdCD", "JBFqnCBsd6RMkjVDRZzb", "N2lVS1w4EtoT3dr4eOWO",
  "SAz9YHcvj6GT2YYXdXww", "TX3LPaxmHKxFdv7VOQHJ", "Xb7hH8MSUJpSbSDYk0k2",
  "XrExE9yKIg1WjnnlVkGX", "bIHbv24MWmeRgasZH58o", "cgSgspJ2msm6clMCkdW9",
  "cjVigY5qzO86Huf0OWal", "iP95p4xoKVk53GoZ742B", "nPczCjzI2devNBz1zQrb",
  "onwK4e9ZLuTAKqWW03F9", "pFZP5JQG7iQjIQuC4Bku", "pqHfZKP75CvOlQylNhV4",
]);

const safeDefaultVoice = (voiceId?: string) =>
  voiceId && DEFAULT_VOICE_IDS.has(voiceId) ? voiceId : "onwK4e9ZLuTAKqWW03F9";

/** Parse ElevenLabs error body into a structured code */
function parseElevenLabsError(status: number, body: string): { error: string; code: string } {
  const lower = body.toLowerCase();
  if (lower.includes("quota_exceeded") || lower.includes("0 credits") || lower.includes("characters remaining")) {
    return { error: "Voice quota exceeded – no credits remaining", code: "quota_exceeded" };
  }
  if (status === 401) {
    return { error: "ElevenLabs API key invalid", code: "unauthorized" };
  }
  if (status === 403) {
    return { error: "ElevenLabs access forbidden", code: "forbidden" };
  }
  return { error: "TTS generation failed", code: "tts_failed" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
  if (!ELEVENLABS_API_KEY) {
    return errorResponse(500, "ElevenLabs API key not configured", "config_error");
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return errorResponse(401, "Unauthorized", "unauthorized");
    }

    const { text, senderId, lang, defaultVoiceId, messageId } = await req.json();

    if (!text || !senderId) {
      return errorResponse(400, "Missing text or senderId", "bad_request");
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Run scope check and voice profile lookup in parallel
    const scopeCheckPromise = (async () => {
      if (user.id === senderId) return true;

      const { data: userConvs } = await adminClient
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user.id);

      const convIds = userConvs?.map((r: any) => r.conversation_id) ?? [];
      if (convIds.length === 0) return false;

      const { count } = await adminClient
        .from("conversation_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", senderId)
        .in("conversation_id", convIds);

      return !!count;
    })();

    const voicePromise = adminClient
      .from("voice_profiles")
      .select("elevenlabs_voice_id")
      .eq("user_id", senderId)
      .maybeSingle();

    const [hasAccess, { data: voiceProfile }] = await Promise.all([scopeCheckPromise, voicePromise]);

    if (!hasAccess) {
      return errorResponse(403, "Forbidden", "forbidden");
    }

    const fallbackVoice = safeDefaultVoice(defaultVoiceId);
    let voiceId = fallbackVoice;

    if (voiceProfile?.elevenlabs_voice_id) {
      if (user.id === senderId) {
        voiceId = voiceProfile.elevenlabs_voice_id;
      } else {
        const { count } = await adminClient
          .from("voice_consents")
          .select("id", { count: "exact", head: true })
          .eq("voice_owner_id", senderId)
          .eq("granted_to_user_id", user.id)
          .eq("status", "granted");

        if (count && count > 0) {
          voiceId = voiceProfile.elevenlabs_voice_id;
        }
      }
    }

    // --- Server-side cache check ---
    const key = await cacheKey(voiceId, text);

    const { data: cachedFile } = await adminClient.storage
      .from("tts-cache")
      .download(key);

    if (cachedFile) {
      // Cache HIT — voice_listen zählt nur bei fremder Stimme; tts_seconds NICHT (kein ElevenLabs-Call)
      if (user.id !== senderId) {
        const lq = await consumeQuota(user.id, "voice_listen", 1);
        if (!lq.ok) return quotaErrorResponse(lq, corsHeaders);
      }

      const arrayBuf = await cachedFile.arrayBuffer();

      if (messageId) {
        // Verify the message belongs to a conversation the caller is a member of
        const { data: msg } = await adminClient
          .from("messages")
          .select("conversation_id")
          .eq("id", messageId)
          .maybeSingle();
        if (msg?.conversation_id) {
          const { count: memberCount } = await adminClient
            .from("conversation_members")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", msg.conversation_id)
            .eq("user_id", user.id);
          if (memberCount && memberCount > 0) {
            adminClient
              .from("messages")
              .update({ audio_url: key })
              .eq("id", messageId)
              .is("audio_url", null)
              .then(({ error }) => {
                if (error) console.error("Failed to set audio_url:", error.message);
              });
          }
        }
      }

      return new Response(arrayBuf, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
          "X-TTS-Cache": "HIT",
          "X-TTS-Cache-Key": key,
        },
      });
    }

    // --- Cache MISS — verbrauche tts_seconds (Schätzung) und ggf. voice_listen ---
    const estimatedSec = Math.max(1, Math.ceil((text || "").length / 13));
    const tq = await consumeQuota(user.id, "tts_seconds", estimatedSec);
    if (!tq.ok) return quotaErrorResponse(tq, corsHeaders);
    if (user.id !== senderId) {
      const lq = await consumeQuota(user.id, "voice_listen", 1);
      if (!lq.ok) return quotaErrorResponse(lq, corsHeaders);
    }

    // --- Cache MISS – generate via ElevenLabs ---
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_22050_32&optimize_streaming_latency=4`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errBody = await ttsResponse.text();
      console.error("TTS stream error:", ttsResponse.status, errBody);
      const parsed = parseElevenLabsError(ttsResponse.status, errBody);
      return errorResponse(502, parsed.error, parsed.code);
    }

    const audioBytes = await ttsResponse.arrayBuffer();
    const audioBlob = new Blob([audioBytes], { type: "audio/mpeg" });

    adminClient.storage
      .from("tts-cache")
      .upload(key, audioBlob, {
        contentType: "audio/mpeg",
        upsert: false,
      })
      .then(({ error }) => {
        if (error) console.error("Cache upload error:", error.message);
        else console.log("Cached TTS audio:", key);
      });

    if (messageId) {
      const { data: msg } = await adminClient
        .from("messages")
        .select("conversation_id")
        .eq("id", messageId)
        .maybeSingle();
      if (msg?.conversation_id) {
        const { count: memberCount } = await adminClient
          .from("conversation_members")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", msg.conversation_id)
          .eq("user_id", user.id);
        if (memberCount && memberCount > 0) {
          adminClient
            .from("messages")
            .update({ audio_url: key })
            .eq("id", messageId)
            .then(({ error }) => {
              if (error) console.error("Failed to set audio_url:", error.message);
            });
        }
      }
    }

    return new Response(audioBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "X-TTS-Cache": "MISS",
        "X-TTS-Cache-Key": key,
      },
    });
  } catch (error) {
    console.error("TTS stream error:", error);
    return errorResponse(500, "Internal server error", "internal_error");
  }
});
