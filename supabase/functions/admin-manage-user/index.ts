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

    const { action, targetUserId, reason, plan, premiumUntil, newPassword, reportId, status: reportStatus, adminNote } = await req.json();

    // ── STATS ──
    if (action === "stats") {
      const [
        { count: totalUsers },
        { count: blockedUsers },
        { count: totalMessages },
        { count: premiumUsers },
        { count: activeUsers },
        { count: voiceProfiles },
      ] = await Promise.all([
        admin.from("profiles").select("id", { count: "exact", head: true }),
        admin.from("blocked_users").select("id", { count: "exact", head: true }),
        admin.from("messages").select("id", { count: "exact", head: true }),
        admin.from("subscriptions").select("id", { count: "exact", head: true }).gt("premium_until", new Date().toISOString()),
        admin.from("user_presence").select("user_id", { count: "exact", head: true }).gt("last_seen", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        admin.from("voice_profiles").select("id", { count: "exact", head: true }),
      ]);
      return json({
        totalUsers: totalUsers || 0,
        blockedUsers: blockedUsers || 0,
        totalMessages: totalMessages || 0,
        premiumUsers: premiumUsers || 0,
        activeUsers: activeUsers || 0,
        voiceProfiles: voiceProfiles || 0,
      });
    }

    if (!targetUserId || typeof targetUserId !== "string") {
      return json({ error: "targetUserId required" }, 400);
    }
    if (targetUserId === user.id && action !== "list") {
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

      // Get message counts per user
      const { data: allMessages } = await admin.from("messages").select("sender_id");
      const msgCounts: Record<string, number> = {};
      for (const m of allMessages || []) {
        msgCounts[m.sender_id] = (msgCounts[m.sender_id] || 0) + 1;
      }

      // Get subscriptions
      const { data: subs } = await admin.from("subscriptions").select("user_id, plan, premium_until, is_founding_user");
      const subMap: Record<string, any> = {};
      for (const s of subs || []) {
        subMap[s.user_id] = s;
      }

      // Get voice profiles
      const { data: voices } = await admin.from("voice_profiles").select("user_id, voice_name, created_at, elevenlabs_voice_id");
      const voiceMap: Record<string, any> = {};
      for (const v of voices || []) {
        voiceMap[v.user_id] = { voice_name: v.voice_name, created_at: v.created_at, elevenlabs_voice_id: v.elevenlabs_voice_id };
      }

      const result = (profiles || []).map((p: any) => ({
        ...p,
        is_blocked: blockedIds.has(p.id),
        message_count: msgCounts[p.id] || 0,
        subscription: subMap[p.id] || null,
        voice_profile: voiceMap[p.id] || null,
      }));
      return json({ profiles: result });
    }

    // ── BLOCK USER ──
    if (action === "block") {
      await admin.from("blocked_users").insert({
        user_id: targetUserId,
        blocked_by: user.id,
        reason: reason || null,
      });
      await admin.auth.admin.updateUserById(targetUserId, {
        ban_duration: "876600h",
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

    // ── SET SUBSCRIPTION ──
    if (action === "set-subscription") {
      if (!plan || !premiumUntil) {
        return json({ error: "plan and premiumUntil required" }, 400);
      }
      const { error: subError } = await admin
        .from("subscriptions")
        .update({
          plan,
          premium_until: premiumUntil,
          is_founding_user: plan === "founding",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", targetUserId);
      if (subError) return json({ error: subError.message }, 500);
      return json({ success: true, action: "subscription-updated" });
    }

    // ── RESET PASSWORD ──
    if (action === "reset-password") {
      if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
        return json({ error: "Password must be at least 8 characters" }, 400);
      }
      const { error: pwError } = await admin.auth.admin.updateUserById(targetUserId, {
        password: newPassword,
      });
      if (pwError) return json({ error: pwError.message }, 500);
      return json({ success: true, action: "password-reset" });
    }

    // ── DELETE VOICE PROFILE ──
    if (action === "delete-voice") {
      const elevenlabsKey = Deno.env.get("ELEVENLABS_API_KEY");
      const { data: voiceProfiles } = await admin
        .from("voice_profiles")
        .select("elevenlabs_voice_id")
        .eq("user_id", targetUserId);
      
      if (elevenlabsKey) {
        for (const v of voiceProfiles || []) {
          try {
            await fetch(`https://api.elevenlabs.io/v1/voices/${v.elevenlabs_voice_id}`, {
              method: "DELETE",
              headers: { "xi-api-key": elevenlabsKey },
            });
          } catch { /* best effort */ }
        }
      }

      // Delete voice samples from storage
      const { data: files } = await admin.storage.from("voice-samples").list(targetUserId);
      if (files?.length) {
        await admin.storage.from("voice-samples").remove(files.map((f: any) => `${targetUserId}/${f.name}`));
      }

      await admin.from("voice_profiles").delete().eq("user_id", targetUserId);
      await admin.from("voice_consents").delete().eq("voice_owner_id", targetUserId);
      // Also delete contact voice profiles that reference this user's voice
      await admin.from("contact_voice_profiles").delete().eq("contact_user_id", targetUserId);

      return json({ success: true, action: "voice-deleted" });
    }

    // ── DELETE USER ──
    if (action === "delete") {
      const elevenlabsKey = Deno.env.get("ELEVENLABS_API_KEY");

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

      for (const bucket of ["avatars", "voice-samples"]) {
        const { data: files } = await admin.storage.from(bucket).list(targetUserId);
        if (files?.length) {
          await admin.storage.from(bucket).remove(files.map((f: any) => `${targetUserId}/${f.name}`));
        }
      }

      const { data: memberships } = await admin
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", targetUserId);
      const convIds = (memberships || []).map((m: any) => m.conversation_id);

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

      await admin.auth.admin.deleteUser(targetUserId);

      return json({ success: true, action: "deleted" });
    }

    // ── LIST REPORTS ──
    if (action === "list-reports") {
      const { data: reports, error } = await admin
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);

      // Enrich with user names
      const userIds = new Set<string>();
      for (const r of reports || []) {
        userIds.add(r.reported_by);
        userIds.add(r.reported_user_id);
      }
      const { data: reportProfiles } = await admin
        .from("profiles")
        .select("id, display_name, phone_number")
        .in("id", Array.from(userIds));
      const nameMap: Record<string, string> = {};
      for (const p of reportProfiles || []) {
        nameMap[p.id] = p.display_name || p.phone_number;
      }

      // For message reports, fetch the reported message content
      const msgIds = (reports || []).filter((r: any) => r.message_id).map((r: any) => r.message_id);
      const msgMap: Record<string, { content: string; message_type: string }> = {};
      if (msgIds.length) {
        const { data: msgs } = await admin.from("messages").select("id, content, message_type").in("id", msgIds);
        for (const m of msgs || []) {
          msgMap[m.id] = { content: m.content, message_type: m.message_type || "text" };
        }
      }

      const enriched = (reports || []).map((r: any) => ({
        ...r,
        reported_by_name: nameMap[r.reported_by] || "Unknown",
        reported_user_name: nameMap[r.reported_user_id] || "Unknown",
        reported_message: r.message_id ? msgMap[r.message_id] || null : null,
      }));
      return json({ reports: enriched });
    }

    // ── UPDATE REPORT STATUS ──
    if (action === "update-report") {
      if (!reportId) return json({ error: "reportId required" }, 400);
      const updateData: any = { updated_at: new Date().toISOString() };
      if (reportStatus) updateData.status = reportStatus;
      if (adminNote !== undefined) updateData.admin_note = adminNote;
      const { error } = await admin.from("reports").update(updateData).eq("id", reportId);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, action: "report-updated" });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("admin-manage-user error:", err);
    return json({ error: err.message }, 500);
  }
});
