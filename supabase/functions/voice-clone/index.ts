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

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const voiceName = formData.get("name") as string || "Stimme";
    const contactUserId = formData.get("contact_user_id") as string | null;

    if (!audioFile) {
      return new Response(JSON.stringify({ error: "No audio file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isContactVoice = !!contactUserId;
    const cloneName = isContactVoice
      ? `clemio_contact_${user.id.slice(0, 8)}_${contactUserId!.slice(0, 8)}`
      : `clemio_${user.id.slice(0, 8)}_${voiceName}`;

    // Clone voice via ElevenLabs
    const elFormData = new FormData();
    elFormData.append("name", cloneName);
    elFormData.append("files", audioFile);
    elFormData.append("description", isContactVoice ? "Contact voice clone for Clemio" : "Voice clone for Clemio user");

    const elResponse = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      body: elFormData,
    });

    if (!elResponse.ok) {
      const errBody = await elResponse.text();
      console.error("ElevenLabs error:", errBody);
      return new Response(JSON.stringify({ error: "Voice cloning failed", details: errBody }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { voice_id } = await elResponse.json();

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (isContactVoice) {
      // Save as contact voice profile
      await adminClient.from("contact_voice_profiles").upsert({
        user_id: user.id,
        contact_user_id: contactUserId,
        elevenlabs_voice_id: voice_id,
        voice_name: voiceName,
      }, { onConflict: "user_id,contact_user_id" });
    } else {
      // Save as own voice profile
      await adminClient.from("voice_profiles").upsert({
        user_id: user.id,
        elevenlabs_voice_id: voice_id,
        voice_name: voiceName,
      }, { onConflict: "user_id" });
    }

    return new Response(JSON.stringify({ success: true, voice_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Voice clone error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
