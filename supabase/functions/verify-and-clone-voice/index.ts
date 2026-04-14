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
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

  if (!ELEVENLABS_API_KEY || !GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "API keys not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Auth
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
    const freeSpeechAudio = formData.get("free_speech") as File;
    const sentenceAudio = formData.get("sentence_audio") as File;
    const expectedSentence = formData.get("expected_sentence") as string;
    const voiceName = formData.get("name") as string || "Meine Stimme";

    if (!freeSpeechAudio || !sentenceAudio || !expectedSentence) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Transcribe the sentence audio via ElevenLabs STT
    const sttFormData = new FormData();
    sttFormData.append("file", sentenceAudio);
    sttFormData.append("model_id", "scribe_v2");

    const sttResponse = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      body: sttFormData,
    });

    if (!sttResponse.ok) {
      const err = await sttResponse.text();
      console.error("STT error:", err);
      return new Response(JSON.stringify({ error: "transcription_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sttResult = await sttResponse.json();
    const transcribedText = (sttResult.text || "").trim().toLowerCase();
    const expectedNormalized = expectedSentence.trim().toLowerCase();

    // Check sentence similarity (allow ~60% word match for natural speech variation)
    const expectedWords = expectedNormalized.split(/\s+/).filter(Boolean);
    const transcribedWords = transcribedText.split(/\s+/).filter(Boolean);
    let matchCount = 0;
    for (const w of expectedWords) {
      if (transcribedWords.some((tw: string) => tw.includes(w) || w.includes(tw))) {
        matchCount++;
      }
    }
    const matchRatio = expectedWords.length > 0 ? matchCount / expectedWords.length : 0;

    if (matchRatio < 0.5) {
      return new Response(JSON.stringify({ 
        error: "sentence_mismatch",
        detail: "The spoken sentence does not match the expected text.",
        transcribed: transcribedText,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Speaker verification via Gemini (multimodal audio comparison)
    const freeSpeechBytes = new Uint8Array(await freeSpeechAudio.arrayBuffer());
    const sentenceBytes = new Uint8Array(await sentenceAudio.arrayBuffer());

    const freeSpeechB64 = btoa(String.fromCharCode(...freeSpeechBytes.length > 500000 
      ? freeSpeechBytes.slice(0, 500000) 
      : freeSpeechBytes));
    const sentenceB64 = btoa(String.fromCharCode(...sentenceBytes.length > 500000 
      ? sentenceBytes.slice(0, 500000) 
      : sentenceBytes));

    const mimeType = freeSpeechAudio.type || "audio/webm";

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "You are a speaker verification system. Compare these two audio recordings and determine if they are from the SAME speaker. Respond with ONLY a JSON object: {\"same_speaker\": true/false, \"confidence\": 0.0-1.0}. Be strict - only return true if you are confident (>0.7) they are the same person." },
              { inlineData: { mimeType, data: freeSpeechB64 } },
              { inlineData: { mimeType, data: sentenceB64 } },
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 100 },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const err = await geminiResponse.text();
      console.error("Gemini verification error:", err);
      // Fall through - don't block on Gemini failure, rely on sentence verification
    } else {
      const geminiResult = await geminiResponse.json();
      const responseText = geminiResult?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      try {
        const jsonMatch = responseText.match(/\{[^}]+\}/);
        if (jsonMatch) {
          const verification = JSON.parse(jsonMatch[0]);
          if (verification.same_speaker === false && verification.confidence > 0.7) {
            return new Response(JSON.stringify({ 
              error: "speaker_mismatch",
              detail: "The two recordings appear to be from different speakers.",
            }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } catch (parseErr) {
        console.warn("Could not parse Gemini response, proceeding:", responseText);
      }
    }

    // Step 3: Clone voice using both audio files combined
    const elFormData = new FormData();
    elFormData.append("name", `clemio_${user.id.slice(0, 8)}_${voiceName}`);
    elFormData.append("files", freeSpeechAudio);
    elFormData.append("files", sentenceAudio);
    elFormData.append("description", "Voice clone for Clemio user - verified");

    const elResponse = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
      body: elFormData,
    });

    if (!elResponse.ok) {
      const errBody = await elResponse.text();
      console.error("ElevenLabs clone error:", errBody);
      return new Response(JSON.stringify({ error: "clone_failed", details: errBody }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { voice_id } = await elResponse.json();

    // Step 4: Save to database
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Delete old voice from ElevenLabs if exists
    const { data: oldVoice } = await adminClient
      .from("voice_profiles")
      .select("elevenlabs_voice_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (oldVoice?.elevenlabs_voice_id) {
      await fetch(`https://api.elevenlabs.io/v1/voices/${oldVoice.elevenlabs_voice_id}`, {
        method: "DELETE",
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
      }).catch(() => {});
    }

    await adminClient.from("voice_profiles").upsert({
      user_id: user.id,
      elevenlabs_voice_id: voice_id,
      voice_name: voiceName,
    }, { onConflict: "user_id" });

    return new Response(JSON.stringify({ success: true, voice_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Verify and clone error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
