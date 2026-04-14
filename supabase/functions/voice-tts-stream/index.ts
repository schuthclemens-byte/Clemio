import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
  if (!ELEVENLABS_API_KEY) {
    return new Response(JSON.stringify({ error: "ElevenLabs API key not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, senderId, lang, defaultVoiceId, messageId } = await req.json();

    if (!text || !senderId) {
      return new Response(JSON.stringify({ error: "Missing text or senderId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fallbackVoice = defaultVoiceId || "onwK4e9ZLuTAKqWW03F9";
    const voiceId = voiceProfile?.elevenlabs_voice_id || fallbackVoice;

    // --- Server-side cache check ---
    const key = await cacheKey(voiceId, text);

    const { data: cachedFile } = await adminClient.storage
      .from("tts-cache")
      .download(key);

    if (cachedFile) {
      // Cache HIT – return stored audio directly
      const arrayBuf = await cachedFile.arrayBuffer();

      // Persist audio_url on message if provided and not yet set (fire-and-forget)
      if (messageId) {
        adminClient
          .from("messages")
          .update({ audio_url: key })
          .eq("id", messageId)
          .is("audio_url", null)
          .then(({ error }) => {
            if (error) console.error("Failed to set audio_url:", error.message);
          });
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
      console.error("TTS stream error:", errBody);
      return new Response(JSON.stringify({ error: "TTS generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read full response body to cache it
    const audioBytes = await ttsResponse.arrayBuffer();
    const audioBlob = new Blob([audioBytes], { type: "audio/mpeg" });

    // Store in cache AND persist audio_url on message (fire-and-forget)
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

    // Persist audio_url on message if provided
    if (messageId) {
      adminClient
        .from("messages")
        .update({ audio_url: key })
        .eq("id", messageId)
        .then(({ error }) => {
          if (error) console.error("Failed to set audio_url:", error.message);
        });
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
