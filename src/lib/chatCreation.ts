import { supabase } from "@/integrations/supabase/client";

/**
 * Find an existing 1:1 conversation between the current user and target,
 * or create a new one atomically via a SECURITY DEFINER RPC.
 * Returns the conversation ID.
 */
export async function findOrCreateDirectChat(
  _currentUserId: string,
  targetUserId: string
): Promise<string> {
  const { data, error } = await supabase.rpc("create_direct_chat", {
    _target_user_id: targetUserId,
  });

  if (error) {
    throw new Error(`create_direct_chat: ${error.message}`);
  }

  return data as string;
}
