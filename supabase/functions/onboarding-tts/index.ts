import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Fixed voice ID for onboarding – same character in every language
const ONBOARDING_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George

const onboardingTexts: Record<string, string> = {
  de: "Willkommen bei Clemio. Hier kannst du Nachrichten nicht nur lesen, sondern auch hören – in der echten Stimme deiner Kontakte. Probier es aus!",
  en: "Welcome to Clemio. Here you can not only read messages, but also listen to them – in the real voice of your contacts. Try it out!",
  fr: "Bienvenue sur Clemio. Ici, tu peux non seulement lire tes messages, mais aussi les écouter – avec la vraie voix de tes contacts. Essaie !",
};
const onboardingTextsExtra: Record<string, string> = {
  tr: "Clemio'ya hoş geldin. Burada mesajları sadece okumakla kalmaz, aynı zamanda kişilerinin gerçek sesiyle dinleyebilirsin. Hemen dene!",
  ar: "مرحبًا بك في كليميو. هنا يمكنك ليس فقط قراءة الرسائل، بل أيضًا الاستماع إليها بصوت جهات اتصالك الحقيقي. جرّبها الآن!",
  es: "Bienvenido a Clemio. Aquí no solo puedes leer mensajes, sino también escucharlos con la voz real de tus contactos. ¡Pruébalo!",
};

const allTexts: Record<string, string> = { ...onboardingTexts, ...onboardingTextsExtra };

const supportedLangs = ["de", "en", "fr", "tr", "ar", "es"];

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
    const { lang } = await req.json();

    // Determine language with fallback
    const resolvedLang = supportedLangs.includes(lang) ? lang : "en";
    const text = allTexts[resolvedLang];

    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ONBOARDING_VOICE_ID}?output_format=mp3_44100_128`,
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
      console.error("Onboarding TTS error:", errBody);
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
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Onboarding TTS error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
