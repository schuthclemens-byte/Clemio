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

const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error || "Unknown error");
const ignoreBestEffortError = (_error: unknown) => undefined;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const allowedActions = new Set([
  "stats", "send-test-push", "list-reports", "update-report", "list-errors", "update-error", "delete-error", "list",
  "block", "unblock", "set-subscription", "reset-password", "delete-voice", "delete",
]);

const invalidRequest = (message = "Invalid request") => json({ error: message }, 400);
const isUuid = (value: unknown) => typeof value === "string" && uuidPattern.test(value);
const safePublicError = (error: unknown) => {
  console.error("admin-manage-user error:", error);
  return json({ error: "Internal server error" }, 500);
};

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

    const { action, targetUserId, reason, plan, premiumUntil, newPassword, reportId, errorId, status: reportStatus, adminNote } = await req.json();
    if (typeof action !== "string" || !allowedActions.has(action)) return invalidRequest("Unknown action");

    const sanitizeMetadata = (meta: Record<string, unknown>): Record<string, unknown> => {
      const safe: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(meta)) {
        if (k === "newPassword" || k === "password") {
          safe.password_set = true;
          continue;
        }
        if (typeof v === "string" && v.length > 500) {
          safe[k] = v.slice(0, 500) + "…";
        } else {
          safe[k] = v;
        }
      }
      return safe;
    };

    const audit = async (success: boolean, metadata: Record<string, unknown> = {}, err?: unknown) => {
      try {
        await admin.from("admin_audit_log").insert({
          admin_user_id: user.id,
          action,
          target_user_id: isUuid(targetUserId) ? targetUserId : null,
          target_resource: isUuid(reportId) ? `report:${reportId}` : isUuid(errorId) ? `app_error:${errorId}` : null,
          metadata: sanitizeMetadata(metadata),
          success,
          error_message: err ? errorMessage(err).slice(0, 500) : null,
        });
      } catch (auditError) {
        ignoreBestEffortError(auditError);
      }
    };

    // Generic error helper: log internally, return neutral message externally
    const failPublic = async (err: unknown, meta: Record<string, unknown> = {}) => {
      console.error(`admin-manage-user[${action}] failed:`, err);
      await audit(false, meta, err);
      return json({ error: "Aktion fehlgeschlagen" }, 500);
    };

    // ── STATS ──
    if (action === "stats") {
      const nowIso = new Date().toISOString();
      const [
        { count: totalUsers },
        { count: blockedUsers },
        { count: totalMessages },
        { count: premiumUsers },
        { count: activeUsers },
        { count: voiceProfiles },
        { count: totalAutoplayEnabled },
        { count: trialActive },
        { count: trialUsed },
        { count: trialClaimsTotal },
      ] = await Promise.all([
        admin.from("profiles").select("id", { count: "exact", head: true }),
        admin.from("blocked_users").select("id", { count: "exact", head: true }),
        admin.from("messages").select("id", { count: "exact", head: true }),
        admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("premium_status", "premium"),
        admin.from("user_presence").select("user_id", { count: "exact", head: true }).gt("last_seen", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        admin.from("voice_profiles").select("id", { count: "exact", head: true }),
        admin.from("contact_autoplay").select("id", { count: "exact", head: true }).eq("auto_play", true),
        admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("premium_status", "trial").gt("premium_trial_ends_at", nowIso),
        admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("has_used_premium_trial", true),
        admin.from("premium_trial_claims").select("id", { count: "exact", head: true }),
      ]);
      const trialExpired = Math.max(0, (trialUsed || 0) - (trialActive || 0) - (premiumUsers || 0));
      const conversionPct = (trialUsed || 0) > 0 ? Math.round(((premiumUsers || 0) / (trialUsed || 1)) * 100) : 0;
      await audit(true, { read: "stats" });
      return json({
        totalUsers: totalUsers || 0,
        blockedUsers: blockedUsers || 0,
        totalMessages: totalMessages || 0,
        premiumUsers: premiumUsers || 0,
        activeUsers: activeUsers || 0,
        voiceProfiles: voiceProfiles || 0,
        autoplayUsers: totalAutoplayEnabled || 0,
        trialActive: trialActive || 0,
        trialUsed: trialUsed || 0,
        trialExpired,
        trialClaimsTotal: trialClaimsTotal || 0,
        trialToPremiumPct: conversionPct,
      });
    }

    // ── SEND TEST PUSH ──
    if (action === "send-test-push") {
      const { data: subs } = await admin
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", targetUserId);
      if (!subs?.length) return json({ error: "No push subscription for this user" }, 404);

      // Call the send-push function internally
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const results = [];
      for (const sub of subs) {
        try {
          const pushRes = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload: {
                title: "🔔 Clemio Admin Test",
                body: "Dies ist eine Test-Push-Benachrichtigung vom Admin.",
                tag: "admin-test",
              },
            }),
          });
          results.push({ endpoint: sub.endpoint.slice(-20), status: pushRes.status });
        } catch (e) {
          results.push({ endpoint: sub.endpoint.slice(-20), error: errorMessage(e) });
        }
      }
      await audit(true, { read: "send-test-push", subscriptions: subs.length });
      return json({ success: true, action: "push-sent", results });
    }

    // ── LIST REPORTS (no targetUserId needed) ──
    if (action === "list-reports") {
      const { data: reports, error } = await admin
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return failPublic(error, { read: "list-reports" });

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
      await audit(true, { read: "list-reports", count: enriched.length });
      return json({ reports: enriched });
    }

    // ── UPDATE REPORT STATUS (no targetUserId needed) ──
    if (action === "update-report") {
      if (!isUuid(reportId)) return invalidRequest("reportId required");
      if (reportStatus && !["open", "reviewed", "resolved"].includes(reportStatus)) return invalidRequest("Invalid status");
      const updateData: any = { updated_at: new Date().toISOString() };
      if (reportStatus) updateData.status = reportStatus;
      if (adminNote !== undefined) updateData.admin_note = String(adminNote).slice(0, 2_000);
      const { error } = await admin.from("reports").update(updateData).eq("id", reportId);
      if (error) return failPublic(error, { reportId, reportStatus });
      await audit(true, { reportId, reportStatus });
      return json({ success: true, action: "report-updated" });
    }

    // ── LIST APP ERRORS (no targetUserId needed) ──
    if (action === "list-errors") {
      const { data: errors, error } = await admin
        .from("app_error_reports")
        .select("*")
        .order("last_seen_at", { ascending: false })
        .limit(200);
      if (error) return failPublic(error, { read: "list-errors" });

      const userIds = [...new Set((errors || []).map((item: any) => item.user_id).filter(Boolean))];
      const { data: profiles } = userIds.length
        ? await admin.from("profiles").select("id, display_name, phone_number").in("id", userIds)
        : { data: [] };
      const profileMap: Record<string, any> = {};
      for (const profile of profiles || []) profileMap[profile.id] = profile;

      const enrichedErrors = (errors || []).map((item: any) => ({
        ...item,
        user_name: profileMap[item.user_id]?.display_name || profileMap[item.user_id]?.phone_number || "Unknown",
        user_phone: profileMap[item.user_id]?.phone_number || null,
      }));
      await audit(true, { read: "list-errors", count: enrichedErrors.length });
      return json({ errors: enrichedErrors });
    }

    // ── UPDATE APP ERROR STATUS / NOTE ──
    if (action === "update-error") {
      if (!isUuid(errorId)) return invalidRequest("errorId required");
      if (reportStatus && !["open", "reviewed", "resolved"].includes(reportStatus)) return invalidRequest("Invalid status");
      const updateData: any = { updated_at: new Date().toISOString() };
      if (reportStatus) updateData.status = reportStatus;
      if (adminNote !== undefined) updateData.admin_note = String(adminNote).slice(0, 2_000);
      const { error } = await admin.from("app_error_reports").update(updateData).eq("id", errorId);
      if (error) return failPublic(error, { errorId, reportStatus });
      await audit(true, { errorId, reportStatus });
      return json({ success: true, action: "error-updated" });
    }

    // ── DELETE APP ERROR ──
    if (action === "delete-error") {
      if (!isUuid(errorId)) return invalidRequest("errorId required");
      const { error } = await admin.from("app_error_reports").delete().eq("id", errorId);
      if (error) return failPublic(error, { errorId });
      await audit(true, { errorId });
      return json({ success: true, action: "error-deleted" });
    }

    // ── LIST ALL PROFILES (no targetUserId needed) ──
    if (action === "list") {
      const { data: profiles, error } = await admin
        .from("profiles")
        .select("id, display_name, phone_number, created_at, avatar_url")
        .order("created_at", { ascending: false });
      if (error) return failPublic(error, { read: "list" });

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
      const { data: subs } = await admin.from("subscriptions").select("user_id, plan, premium_until, is_founding_user, has_used_premium_trial, premium_trial_started_at, premium_trial_ends_at, premium_status, premium_plan, premium_current_period_end");
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
      await audit(true, { read: "list", count: result.length });
      return json({ profiles: result });
    }

    // From here on, all actions require a valid targetUserId
    if (!isUuid(targetUserId)) {
      return invalidRequest("targetUserId required");
    }
    if (targetUserId === user.id) {
      return json({ error: "Cannot perform admin action on yourself" }, 400);
    }
    const { data: targetRole } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUserId)
      .eq("role", "admin")
      .maybeSingle();
    if (targetRole && ["block", "delete", "reset-password"].includes(action)) {
      return json({ error: "Protected admin account" }, 403);
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
      await audit(true, { reason: reason ? String(reason).slice(0, 500) : null });
      return json({ success: true, action: "blocked" });
    }

    // ── UNBLOCK USER ──
    if (action === "unblock") {
      await admin.from("blocked_users").delete().eq("user_id", targetUserId);
      await admin.auth.admin.updateUserById(targetUserId, {
        ban_duration: "none",
      });
      await audit(true);
      return json({ success: true, action: "unblocked" });
    }

    // ── SET SUBSCRIPTION ──
    if (action === "set-subscription") {
      if (!["free", "premium", "founding", "trial"].includes(plan) || !premiumUntil || Number.isNaN(Date.parse(premiumUntil))) {
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
      if (subError) return failPublic(subError, { plan, premiumUntil });
      await audit(true, { plan, premiumUntil });
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
      if (pwError) return failPublic(pwError, { password_set: true });
      await audit(true, { password_set: true });
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
          } catch (error) {
            ignoreBestEffortError(error);
          }
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

      await audit(true);
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
          } catch (error) {
            ignoreBestEffortError(error);
          }
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

      await audit(true, { deletedConversations: convIds.length });
      return json({ success: true, action: "deleted" });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return safePublicError(err);
  }
});
