import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    // Check admin role
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) return json({ error: "Forbidden: admin role required" }, 403);

    const { action, targetUserId, reason } = await req.json();

    if (!targetUserId || typeof targetUserId !== "string") {
      return json({ error: "targetUserId required" }, 400);
    }
    if (targetUserId === user.id) {
      return json({ error: "Cannot perform admin action on yourself" }, 400);
    }

    // ── LIST ALL PROFILES ──
    if (action === "list") {
      const { data: profiles, error } = await admin
        .from("profiles")
        .select("id, display_name, phone_number, created_at, avatar_url")
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);

      // Get blocked user ids
      const { data: blocked } = await admin.from("blocked_users").select("user_id");
      const blockedIds = new Set((blocked || []).map((b: any) => b.user_id));

      const result = (profiles || []).map((p: any) => ({
        ...p,
        is_blocked: blockedIds.has(p.id),
      }));
      return json({ profiles: result });
    }

    // ── BLOCK USER ──
    if (action === "block") {
      // Insert into blocked_users
      await admin.from("blocked_users").insert({
        user_id: targetUserId,
        blocked_by: user.id,
        reason: reason || null,
      });
      // Ban in auth
      await admin.auth.admin.updateUserById(targetUserId, {
        ban_duration: "876600h", // ~100 years
      });
      return json({ success: true, action: "blocked" });
    }

    // ── UNBLOCK USER ──
    if (action === "unblock") {
      await admin.from("blocked_users").delete().eq("user_id", targetUserId);
      await admin.auth.admin.updateUserById(targetUserId, {
        ban_duration: "none",
      });
      return json({ success: true, action: "unblocked" });
    }

    // ── DELETE USER ──
    if (action === "delete") {
      const elevenlabsKey = Deno.env.get("ELEVENLABS_API_KEY");

      // Delete ElevenLabs voices
      const { data: ownVoices } = await admin
        .from("voice_profiles")
        .select("elevenlabs_voice_id")
        .eq("user_id", targetUserId);
      if (elevenlabsKey) {
        for (const v of ownVoices || []) {
          try {
            await fetch(`https://api.elevenlabs.io/v1/voices/${v.elevenlabs_voice_id}`, {
              method: "DELETE",
              headers: { "xi-api-key": elevenlabsKey },
            });
          } catch { /* best effort */ }
        }
      }

      // Delete storage
      for (const bucket of ["avatars", "voice-samples"]) {
        const { data: files } = await admin.storage.from(bucket).list(targetUserId);
        if (files?.length) {
          await admin.storage.from(bucket).remove(files.map((f: any) => `${targetUserId}/${f.name}`));
        }
      }

      // Get conversations
      const { data: memberships } = await admin
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", targetUserId);
      const convIds = (memberships || []).map((m: any) => m.conversation_id);

      // Delete reactions on user's messages
      if (convIds.length) {
        const { data: userMsgs } = await admin
          .from("messages")
          .select("id")
          .eq("sender_id", targetUserId);
        const msgIds = (userMsgs || []).map((m: any) => m.id);
        if (msgIds.length) {
          await admin.from("message_reactions").delete().in("message_id", msgIds);
        }
      }
      await admin.from("message_reactions").delete().eq("user_id", targetUserId);
      await admin.from("messages").delete().eq("sender_id", targetUserId);
      await admin.from("typing_indicators").delete().eq("user_id", targetUserId);
      await admin.from("conversation_members").delete().eq("user_id", targetUserId);

      if (convIds.length) {
        for (const cid of convIds) {
          const { count } = await admin
            .from("conversation_members")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", cid);
          if (count === 0) {
            await admin.from("messages").delete().eq("conversation_id", cid);
            await admin.from("conversations").delete().eq("id", cid);
          }
        }
      }

      await admin.from("voice_profiles").delete().eq("user_id", targetUserId);
      await admin.from("voice_consents").delete().eq("voice_owner_id", targetUserId);
      await admin.from("voice_consents").delete().eq("granted_to_user_id", targetUserId);
      await admin.from("contact_aliases").delete().eq("user_id", targetUserId);
      await admin.from("contact_autoplay").delete().eq("user_id", targetUserId);
      await admin.from("contact_voice_profiles").delete().eq("user_id", targetUserId);
      await admin.from("focus_contacts").delete().eq("user_id", targetUserId);
      await admin.from("chat_invitations").delete().eq("invited_by", targetUserId);
      await admin.from("chat_invitations").delete().eq("invited_user_id", targetUserId);
      await admin.from("clemio_ki_usage").delete().eq("user_id", targetUserId);
      await admin.from("calls").delete().eq("caller_id", targetUserId);
      await admin.from("calls").delete().eq("receiver_id", targetUserId);
      await admin.from("subscriptions").delete().eq("user_id", targetUserId);
      await admin.from("push_subscriptions").delete().eq("user_id", targetUserId);
      await admin.from("user_presence").delete().eq("user_id", targetUserId);
      await admin.from("blocked_users").delete().eq("user_id", targetUserId);
      await admin.from("user_roles").delete().eq("user_id", targetUserId);
      await admin.from("profiles").delete().eq("id", targetUserId);

      // Delete auth user
      await admin.auth.admin.deleteUser(targetUserId);

      return json({ success: true, action: "deleted" });
    }

    return json({ error: "Unknown action. Use: list, block, unblock, delete" }, 400);
  } catch (err) {
    console.error("admin-manage-user error:", err);
    return json({ error: err.message }, 500);
  }
});
