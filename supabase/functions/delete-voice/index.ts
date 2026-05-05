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

    // Look up the user's OWN voice profile — never trust client-supplied voice IDs.
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await adminClient
      .from("voice_profiles")
      .select("elevenlabs_voice_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const ownVoiceId = profile?.elevenlabs_voice_id;
    if (ownVoiceId) {
      const elResponse = await fetch(
        `https://api.elevenlabs.io/v1/voices/${ownVoiceId}`,
        {
          method: "DELETE",
          headers: { "xi-api-key": ELEVENLABS_API_KEY },
        }
      );
      if (!elResponse.ok && elResponse.status !== 404) {
        const errBody = await elResponse.text();
        console.error("ElevenLabs delete error:", errBody);
      }
    }

    await adminClient
      .from("voice_profiles")
      .delete()
      .eq("user_id", user.id);

    await adminClient
      .from("voice_consents")
      .delete()
      .eq("voice_owner_id", user.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Delete voice error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
