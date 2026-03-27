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

    const { text, senderId, lang } = await req.json();

    if (!text || !senderId) {
      return new Response(JSON.stringify({ error: "Missing text or senderId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map short locale codes to ElevenLabs language codes
    const langMap: Record<string, string> = {
      de: "de", en: "en", fr: "fr", es: "es", tr: "tr", ar: "ar",
    };
    const languageCode = langMap[lang] || "de";

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Priority 1: Check if the requesting user has a contact voice profile for this sender
    const { data: contactVoice } = await adminClient
      .from("contact_voice_profiles")
      .select("elevenlabs_voice_id")
      .eq("user_id", user.id)
      .eq("contact_user_id", senderId)
      .maybeSingle();

    let voiceId: string | null = contactVoice?.elevenlabs_voice_id ?? null;

    // Priority 2: Fall back to sender's own voice profile (with consent check)
    if (!voiceId) {
      const { data: voiceProfile } = await adminClient
        .from("voice_profiles")
        .select("elevenlabs_voice_id")
        .eq("user_id", senderId)
        .maybeSingle();

      if (!voiceProfile) {
        return new Response(JSON.stringify({ error: "No voice profile for this user" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check consent for sender's own voice
      const { data: consent } = await adminClient
        .from("voice_consents")
        .select("status")
        .eq("voice_owner_id", senderId)
        .eq("granted_to_user_id", user.id)
        .eq("status", "granted")
        .maybeSingle();

      if (!consent) {
        return new Response(JSON.stringify({ error: "No consent granted" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      voiceId = voiceProfile.elevenlabs_voice_id;
    }

    // Generate TTS with the resolved voice
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
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
      console.error("TTS error:", errBody);
      return new Response(JSON.stringify({ error: "TTS generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBuffer = await ttsResponse.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
