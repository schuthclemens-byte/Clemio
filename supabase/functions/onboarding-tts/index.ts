import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, cache-control, pragma",
};

const ONBOARDING_VOICE_ID = "8CYuycxIONSFhKXKhsfw";

const allTexts: Record<string, string> = {
  de: "Willkommen bei Clemio. Hier kannst du Nachrichten nicht nur lesen, sondern auch hören – in der echten Stimme deiner Kontakte. Probier es aus!",
  en: "Welcome to Clemio. Here you can not only read messages, but also listen to them – in the real voice of your contacts. Try it out!",
  fr: "Bienvenue sur Clemio. Ici, tu peux non seulement lire tes messages, mais aussi les écouter – avec la vraie voix de tes contacts. Essaie !",
  tr: "Clemio'ya hoş geldin. Burada mesajları sadece okumakla kalmaz, aynı zamanda kişilerinin gerçek sesiyle dinleyebilirsin. Hemen dene!",
  ar: "مرحبًا بك في كليميو. هنا يمكنك ليس فقط قراءة الرسائل، بل أيضًا الاستماع إليها بصوت جهات اتصالك الحقيقي. جرّبها الآن!",
  es: "Bienvenido a Clemio. Aquí no solo puedes leer mensajes, sino también escucharlos con la voz real de tus contactos. ¡Pruébalo!",
};

const supportedLangs = ["de", "en", "fr", "tr", "ar", "es"];

async function hashText(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const requestUrl = new URL(req.url);
    const queryLang = requestUrl.searchParams.get("lang");
    let bodyLang: string | null = null;
    if (req.method === "POST") {
      try { bodyLang = (await req.json()).lang; } catch { /* ignore */ }
    }
    const lang = queryLang ?? bodyLang;
    const resolvedLang = supportedLangs.includes(lang as string) ? lang as string : "en";
    const text = allTexts[resolvedLang];
    const textHash = await hashText(text);
    const storagePath = `onboarding/${resolvedLang}_${textHash}.mp3`;

    // 1. Check cache
    const { data: cachedFile, error: downloadError } = await supabase.storage
      .from("tts-cache")
      .download(storagePath);

    if (cachedFile && !downloadError) {
      console.log(`Cache HIT: ${storagePath}`);
      const audioBuffer = await cachedFile.arrayBuffer();
      return new Response(audioBuffer, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=86400",
          "X-Voice-Id": ONBOARDING_VOICE_ID,
          "X-Cache": "HIT",
        },
      });
    }

    // 2. Cache miss → generate via ElevenLabs
    console.log(`Cache MISS: ${storagePath} – calling ElevenLabs`);
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
      console.error("ElevenLabs TTS error:", errBody);
      return new Response(JSON.stringify({ error: "TTS_GENERATION_FAILED", fallback: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBuffer = await ttsResponse.arrayBuffer();

    // 3. Save to cache (fire-and-forget)
    const blob = new Blob([audioBuffer], { type: "audio/mpeg" });
    supabase.storage
      .from("tts-cache")
      .upload(storagePath, blob, { contentType: "audio/mpeg", upsert: true })
      .then(({ error }) => {
        if (error) console.error("Cache write failed:", error.message);
        else console.log(`Cached: ${storagePath}`);
      });

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
        "X-Voice-Id": ONBOARDING_VOICE_ID,
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("Onboarding TTS error:", error);
    return new Response(JSON.stringify({ error: "SERVICE_FAILED", fallback: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
