import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    const { text, senderId, lang, defaultVoiceId } = await req.json();

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

    // Use streaming endpoint with max latency optimization and smaller format
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

    // Stream the response body directly
    return new Response(ttsResponse.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
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
