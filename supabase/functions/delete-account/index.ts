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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const elevenlabsKey = Deno.env.get("ELEVENLABS_API_KEY");

    // Auth: get user from token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Delete ElevenLabs voices (own + contact)
    const { data: ownVoices } = await admin
      .from("voice_profiles")
      .select("elevenlabs_voice_id")
      .eq("user_id", userId);
    const allVoiceIds = [
      ...(ownVoices || []).map((v: any) => v.elevenlabs_voice_id),
    ];

    if (elevenlabsKey) {
      for (const vid of allVoiceIds) {
        try {
          await fetch(`https://api.elevenlabs.io/v1/voices/${vid}`, {
            method: "DELETE",
            headers: { "xi-api-key": elevenlabsKey },
          });
        } catch { /* best effort */ }
      }
    }

    // 2. Delete storage files (avatars, chat-media, voice-samples)
    for (const bucket of ["avatars", "voice-samples"]) {
      const { data: files } = await admin.storage.from(bucket).list(userId);
      if (files?.length) {
        await admin.storage.from(bucket).remove(files.map((f: any) => `${userId}/${f.name}`));
      }
    }

    // 3. Get user's conversations to delete their messages/media
    const { data: memberships } = await admin
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", userId);
    const convIds = (memberships || []).map((m: any) => m.conversation_id);

    // 4. Delete all DB records (order matters for FK constraints)
    // Message reactions on user's messages
    if (convIds.length) {
      const { data: userMsgs } = await admin
        .from("messages")
        .select("id")
        .eq("sender_id", userId);
      const msgIds = (userMsgs || []).map((m: any) => m.id);
      if (msgIds.length) {
        await admin.from("message_reactions").delete().in("message_id", msgIds);
      }
    }
    // User's own reactions
    await admin.from("message_reactions").delete().eq("user_id", userId);
    
    // Messages sent by user
    await admin.from("messages").delete().eq("sender_id", userId);
    
    // Typing indicators
    await admin.from("typing_indicators").delete().eq("user_id", userId);
    
    // Conversation memberships
    await admin.from("conversation_members").delete().eq("user_id", userId);
    
    // Conversations created by user (only if no other members remain)
    if (convIds.length) {
      for (const cid of convIds) {
        const { count } = await admin
          .from("conversation_members")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", cid);
        if (count === 0) {
          // Delete remaining messages in empty conversation
          await admin.from("messages").delete().eq("conversation_id", cid);
          await admin.from("conversations").delete().eq("id", cid);
        }
      }
    }

    // Voice data
    await admin.from("voice_profiles").delete().eq("user_id", userId);

    // Contact data
    await admin.from("contact_aliases").delete().eq("user_id", userId);
    await admin.from("contact_autoplay").delete().eq("user_id", userId);
    await admin.from("focus_contacts").delete().eq("user_id", userId);

    // Subscription & push
    await admin.from("subscriptions").delete().eq("user_id", userId);
    await admin.from("push_subscriptions").delete().eq("user_id", userId);

    // Presence
    await admin.from("user_presence").delete().eq("user_id", userId);

    // Profile (last, before auth user)
    await admin.from("profiles").delete().eq("id", userId);

    // 5. Delete auth user
    await admin.auth.admin.deleteUser(userId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("delete-account error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
