import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Du bist Clemio-KI – eine KI, die direkt in Nachrichten integriert ist.
Du hilfst Nutzern, genau die richtigen Worte zu finden – schnell, natürlich und menschlich.

SCHREIBSTIL:
- kurz (max. 1–2 Sätze)
- wie echte WhatsApp Nachrichten
- leicht unperfekt, nicht zu glatt
- emotional passend zur Situation
- keine formelle Sprache

VERMEIDE:
- typische KI-Sätze
- „Ich würde mir wünschen"
- „Es wäre schön"
- lange oder komplizierte Formulierungen
- „Ich als KI"

KONTEXT:
Berücksichtige: Dating, Konflikt, Unsicherheit, allgemein
ZIEL: z.B. Interesse testen, Klarheit schaffen, locker bleiben, Distanz schaffen

MENSCHLICHKEIT:
Antworten sollen sich anfühlen, als hätte ein echter Mensch sie geschrieben.

WICHTIG:
- Clemio-KI ist Teil eines Chats
- Antworten müssen sofort nutzbar sein
- keine zusätzlichen Erklärungen
- Gib die Antworten als JSON-Array zurück

Du antwortest IMMER im folgenden JSON-Format, NICHTS anderes:`;

const STANDARD_FORMAT = `MODUS STANDARD:
Gib genau 3 Antwortvarianten zurück als JSON:
{"answers":[{"text":"..."},{"text":"..."},{"text":"..."}]}
Keine Erklärung, keine Wirkung, nur die Antworten.`;

const STRATEGY_FORMAT = `MODUS STRATEGIE:
Gib eine kurze Einschätzung und 3 Antworten mit Wirkung zurück als JSON:
{"assessment":"...(max 1 Satz)","answers":[{"text":"...","effect":"...(max 1 Satz)"},{"text":"...","effect":"..."},{"text":"...","effect":"..."}]}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { receivedMessage, chatHistory, mode } = await req.json();

    if (!receivedMessage) {
      return new Response(
        JSON.stringify({ error: "receivedMessage is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const isStrategy = mode === "strategy";
    const formatPrompt = isStrategy ? STRATEGY_FORMAT : STANDARD_FORMAT;

    // Build context from chat history
    let contextStr = "";
    if (chatHistory && chatHistory.length > 0) {
      const last5 = chatHistory.slice(-5);
      contextStr = "\n\nLetzter Chatverlauf:\n" + last5.map((m: any) =>
        `${m.isMine ? "Ich" : "Kontakt"}: ${m.text}`
      ).join("\n");
    }

    const userPrompt = `Die letzte Nachricht, auf die ich antworten will:
"${receivedMessage}"${contextStr}

Generiere passende Antworten.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + "\n\n" + formatPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    let raw = data.choices?.[0]?.message?.content?.trim() || "";

    // Strip markdown code fences if present
    raw = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("Failed to parse AI response as JSON:", raw);
      // Fallback: return raw text as single answer
      parsed = { answers: [{ text: raw }] };
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("clemio-ki error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
