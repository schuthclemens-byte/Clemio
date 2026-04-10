import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
  if (!ELEVENLABS_API_KEY) {
    return new Response(JSON.stringify({ error: "No API key" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { sample_url } = await req.json();

    const audioResponse = await fetch(sample_url);
    if (!audioResponse.ok) {
      return new Response(JSON.stringify({ error: "Could not fetch audio sample" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBlob = await audioResponse.blob();
    const formData = new FormData();
    formData.append("name", "clemio_landing_voice");
    formData.append("description", "Landing page greeting voice for Clemio");
    formData.append("files", new File([audioBlob], "sample.mp3", { type: "audio/mpeg" }));

    const elResponse = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      body: formData,
    });

    const raw = await elResponse.text();
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      result = raw;
    }

    return new Response(JSON.stringify({ status: elResponse.status, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
