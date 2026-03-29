import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.24.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  conversationId: z.string().uuid(),
  isVideo: z.boolean(),
});

Deno.serve(async (req) => {
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

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { conversationId, isVideo } = parsed.data;
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Missing backend configuration");
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: members, error: memberError } = await admin
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", conversationId);

    if (memberError) {
      throw memberError;
    }

    const isParticipant = members?.some((member) => member.user_id === user.id);
    if (!isParticipant) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipientIds = (members ?? [])
      .map((member) => member.user_id)
      .filter((memberId) => memberId !== user.id);

    if (recipientIds.length === 0) {
      return new Response(JSON.stringify({ notified: 0, results: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    const callerName = callerProfile?.display_name || "Jemand";

    const pushBody = isVideo
      ? `${callerName} ruft dich per Video an. Tippe zum Annehmen.`
      : `${callerName} ruft dich an. Tippe zum Annehmen.`;

    const results = [];

    for (const recipientId of recipientIds) {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          user_id: recipientId,
          title: isVideo ? "Eingehender Videoanruf" : "Eingehender Anruf",
          body: pushBody,
          data: {
            type: "incoming_call",
            conversation_id: conversationId,
            caller_id: user.id,
            caller_name: callerName,
            is_video: isVideo,
            path: `/call/${conversationId}?incoming=true&video=${isVideo}`,
          },
        }),
      });

      const result = await response.json().catch(() => null);
      results.push({
        recipientId,
        ok: response.ok,
        status: response.status,
        result,
      });
    }

    return new Response(
      JSON.stringify({
        notified: results.filter((entry) => entry.ok).length,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[notify-incoming-call] fatal", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
