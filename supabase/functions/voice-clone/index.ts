import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { consumeQuota, quotaErrorResponse } from "../_shared/quota.ts";

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

    const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 MB
    if (audioFile.size > MAX_AUDIO_BYTES) {
      return new Response(JSON.stringify({ error: "audio_too_large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: This endpoint only handles CONTACT voice clones.
    // Own-voice cloning MUST go through `verify-and-clone-voice` which enforces
    // speaker verification (sentence match + Gemini speaker comparison).
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!contactUserId || !UUID_RE.test(contactUserId)) {
      return new Response(JSON.stringify({
        error: "contact_user_id_required",
        message: "Own-voice cloning must use the verified flow (verify-and-clone-voice).",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (contactUserId === user.id) {
      return new Response(JSON.stringify({ error: "invalid_contact" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    {
      const adminCheck = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: contactProfile } = await adminCheck
        .from("profiles")
        .select("id")
        .eq("id", contactUserId)
        .maybeSingle();
      if (!contactProfile) {
        return new Response(JSON.stringify({ error: "contact_not_found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }


    // Quota: voice cloning counts as voice_retrain (limited per month)
    const quota = await consumeQuota(user.id, "voice_retrain", 1);
    if (!quota.ok) {
      return quotaErrorResponse(quota, corsHeaders);
    }

    const cloneName = `clemio_contact_${user.id.slice(0, 8)}_${contactUserId.slice(0, 8)}`;

    // Clone voice via ElevenLabs
    const elFormData = new FormData();
    elFormData.append("name", cloneName);
    elFormData.append("files", audioFile);
    elFormData.append("description", "Contact voice clone for Clemio");

    const elResponse = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      body: elFormData,
    });

    if (!elResponse.ok) {
      const errBody = await elResponse.text();
      console.error("ElevenLabs error:", errBody);
      return new Response(JSON.stringify({ error: "Voice cloning failed", code: "el_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { voice_id } = await elResponse.json();

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Only contact voice profiles — own-voice writes are forbidden here.
    await adminClient.from("contact_voice_profiles").upsert({
      user_id: user.id,
      contact_user_id: contactUserId,
      elevenlabs_voice_id: voice_id,
      voice_name: voiceName,
    }, { onConflict: "user_id,contact_user_id" });

    return new Response(JSON.stringify({ success: true, voice_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Voice clone error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
