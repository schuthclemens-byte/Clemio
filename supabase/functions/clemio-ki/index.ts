import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FREE_DAILY_LIMIT = 3;

const REPLY_SYSTEM_PROMPT = `Du bist Clemio-KI – eine KI, die direkt in Nachrichten integriert ist.
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

const REFINE_SYSTEM_PROMPT = `Du bist Clemio-KI – eine KI, die Nutzern hilft, ihre eigenen Nachrichten zu verbessern.
Der Nutzer hat bereits eine Nachricht getippt, aber möchte sie besser formulieren.

DEIN JOB:
- Verbessere die Nachricht des Nutzers
- Behalte die ursprüngliche Intention und den Ton bei
- Mache sie natürlicher, klarer oder wirkungsvoller
- Biete verschiedene Varianten an (z.B. direkter, emotionaler, lockerer)

SCHREIBSTIL:
- wie echte WhatsApp Nachrichten
- leicht unperfekt, nicht zu glatt
- emotional passend zur Situation
- keine formelle Sprache

VERMEIDE:
- typische KI-Sätze
- komplizierte Formulierungen
- den Sinn der Nachricht zu verändern

WICHTIG:
- Die Varianten müssen sofort nutzbar sein
- keine zusätzlichen Erklärungen
- Gib die Antworten als JSON-Array zurück

Du antwortest IMMER im folgenden JSON-Format, NICHTS anderes:`;

const STANDARD_FORMAT = `MODUS STANDARD:
Gib genau 3 Antwortvarianten zurück als JSON:
{"answers":[{"text":"..."},{"text":"..."},{"text":"..."}]}
Keine Erklärung, keine Wirkung, nur die Antworten.`;

const REFINE_FORMAT = `MODUS VERBESSERN:
Gib genau 3 verbesserte Varianten der Nachricht des Nutzers zurück als JSON:
{"answers":[{"text":"..."},{"text":"..."},{"text":"..."}]}
Keine Erklärung, nur die verbesserten Nachrichten.`;

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

    const { receivedMessage, draftMessage, chatHistory, mode, checkOnly, locale } = await req.json();

    const langNames: Record<string, string> = {
      de: "German", en: "English", fr: "French", tr: "Turkish", es: "Spanish", ar: "Arabic",
    };
    const userLang = langNames[locale] || "German";

    // Check subscription status
    const { data: sub } = await supabaseClient
      .from("subscriptions")
      .select("plan, is_founding_user, premium_until")
      .eq("user_id", user.id)
      .maybeSingle();

    let isPremium = false;
    if (sub) {
      if (sub.plan === "founding" || sub.plan === "premium") isPremium = true;
      if (sub.premium_until && new Date(sub.premium_until) > new Date()) isPremium = true;
    }

    // Check daily usage for free users
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: todayCount } = await supabaseClient
      .from("clemio_ki_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("used_at", todayStart.toISOString());

    const usedToday = todayCount ?? 0;
    const remaining = isPremium ? -1 : Math.max(0, FREE_DAILY_LIMIT - usedToday);

    // If just checking usage status
    if (checkOnly) {
      return new Response(
        JSON.stringify({ remaining, limit: FREE_DAILY_LIMIT, isPremium }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enforce limit for free users
    if (!isPremium && usedToday >= FREE_DAILY_LIMIT) {
      return new Response(
        JSON.stringify({
          error: "LIMIT_REACHED",
          message: "Du hast dein Limit erreicht. Hol dir Premium für unbegrenzte Antworten.",
          remaining: 0,
          limit: FREE_DAILY_LIMIT,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine mode: refine (user's draft) vs reply (answer to received message)
    const isRefine = !!draftMessage;
    const isStrategy = mode === "strategy" && !isRefine;

    if (!isRefine && !receivedMessage) {
      return new Response(
        JSON.stringify({ error: "receivedMessage or draftMessage is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt: string;
    let formatPrompt: string;
    let userPrompt: string;

    if (isRefine) {
      systemPrompt = REFINE_SYSTEM_PROMPT;
      formatPrompt = REFINE_FORMAT;

      let contextStr = "";
      if (chatHistory && chatHistory.length > 0) {
        const last5 = chatHistory.slice(-5);
        contextStr = "\n\nLetzter Chatverlauf:\n" + last5.map((m: any) =>
          `${m.isMine ? "Ich" : "Kontakt"}: ${m.text}`
        ).join("\n");
      }

      userPrompt = `Meine Nachricht, die ich verbessern möchte:
"${draftMessage}"${contextStr}

Generiere 3 verbesserte Varianten auf ${userLang}.`;
    } else {
      systemPrompt = REPLY_SYSTEM_PROMPT;
      formatPrompt = isStrategy ? STRATEGY_FORMAT : STANDARD_FORMAT;

      let contextStr = "";
      if (chatHistory && chatHistory.length > 0) {
        const last5 = chatHistory.slice(-5);
        contextStr = "\n\nLetzter Chatverlauf:\n" + last5.map((m: any) =>
          `${m.isMine ? "Ich" : "Kontakt"}: ${m.text}`
        ).join("\n");
      }

      userPrompt = `Die letzte Nachricht, auf die ich antworten will:
"${receivedMessage}"${contextStr}

Generiere passende Antworten auf ${userLang}.`;
    }

    const langInstruction = `\n\nSPRACHE: Antworte IMMER auf ${userLang}. Alle Texte (Antworten, Einschätzung, Wirkung) müssen auf ${userLang} sein.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt + "\n\n" + formatPrompt + langInstruction },
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

    // Track usage AFTER successful generation
    await supabaseClient.from("clemio_ki_usage").insert({ user_id: user.id });

    const data = await response.json();
    let raw = data.choices?.[0]?.message?.content?.trim() || "";
    raw = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("Failed to parse AI response as JSON:", raw);
      parsed = { answers: [{ text: raw }] };
    }

    const newRemaining = isPremium ? -1 : Math.max(0, FREE_DAILY_LIMIT - usedToday - 1);
    parsed.remaining = newRemaining;
    parsed.limit = FREE_DAILY_LIMIT;
    parsed.isPremium = isPremium;
    parsed.isRefine = isRefine;

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
