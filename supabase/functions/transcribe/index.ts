import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse the request — accepts either FormData (with audio file) or JSON (with audio_url)
    let audioFile: File | null = null;
    let audioUrl: string | null = null;
    let language: string | null = null;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      audioFile = formData.get("audio") as File | null;
      language = formData.get("language") as string | null;
    } else {
      const body = await req.json();
      audioUrl = body.audio_url || null;
      language = body.language || null;
    }

    // If we have a URL, fetch the audio first
    if (audioUrl && !audioFile) {
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch audio" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const blob = await audioResponse.blob();
      audioFile = new File([blob], "audio.webm", { type: blob.type || "audio/webm" });
    }

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "No audio provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Call ElevenLabs Speech-to-Text
    const apiFormData = new FormData();
    apiFormData.append("file", audioFile);
    apiFormData.append("model_id", "scribe_v2");
    if (language) {
      // Map app locale to ISO 639-3 for ElevenLabs
      const langMap: Record<string, string> = {
        de: "deu",
        en: "eng",
        fr: "fra",
        es: "spa",
        tr: "tur",
        ar: "ara",
      };
      apiFormData.append("language_code", langMap[language] || language);
    }

    const sttResponse = await fetch(
      "https://api.elevenlabs.io/v1/speech-to-text",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: apiFormData,
      }
    );

    if (!sttResponse.ok) {
      const errText = await sttResponse.text();
      console.error("ElevenLabs STT error:", sttResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "Transcription failed", details: errText }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = await sttResponse.json();

    return new Response(
      JSON.stringify({
        text: result.text || "",
        words: result.words || [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Transcription error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
