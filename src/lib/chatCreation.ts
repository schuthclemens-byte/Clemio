import { supabase } from "@/integrations/supabase/client";

/**
 * Find an existing 1:1 conversation between two users, or create a new one.
 * Returns the conversation ID.
 */
export async function findOrCreateDirectChat(
  currentUserId: string,
  targetUserId: string
): Promise<string> {
  // 1. Check for existing 1:1 conversation
  const [myRes, theirRes] = await Promise.all([
    supabase.from("conversation_members").select("conversation_id").eq("user_id", currentUserId),
    supabase.from("conversation_members").select("conversation_id").eq("user_id", targetUserId),
  ]);

  if (myRes.error) throw myRes.error;
  if (theirRes.error) throw theirRes.error;

  const myIds = new Set((myRes.data ?? []).map((m) => m.conversation_id));
  const sharedIds = (theirRes.data ?? [])
    .map((m) => m.conversation_id)
    .filter((id) => myIds.has(id));

  if (sharedIds.length > 0) {
    const { data: existing, error: existingErr } = await supabase
      .from("conversations")
      .select("id")
      .in("id", sharedIds)
      .eq("is_group", false)
      .limit(1)
      .maybeSingle();

    if (existingErr) throw existingErr;
    if (existing?.id) return existing.id;
  }

  // 2. Create new conversation
  const conversationId = crypto.randomUUID();

  const { error: convErr } = await supabase
    .from("conversations")
    .insert({ id: conversationId, created_by: currentUserId, name: null, is_group: false });
  if (convErr) throw new Error(`conversations: ${convErr.message}`);

  // 3. Add creator as member
  const { error: memberErr } = await supabase
    .from("conversation_members")
    .insert({ conversation_id: conversationId, user_id: currentUserId });
  if (memberErr) throw new Error(`conversation_members: ${memberErr.message}`);

  // 4. Create accepted invitation (required by RLS before adding target member)
  const { error: invErr } = await supabase
    .from("chat_invitations")
    .insert({
      conversation_id: conversationId,
      invited_by: currentUserId,
      invited_user_id: targetUserId,
      status: "accepted",
    });
  if (invErr) throw new Error(`chat_invitations: ${invErr.message}`);

  // 5. Add target as member
  const { error: targetErr } = await supabase
    .from("conversation_members")
    .insert({ conversation_id: conversationId, user_id: targetUserId });
  if (targetErr) throw new Error(`conversation_members: ${targetErr.message}`);

  return conversationId;
}
