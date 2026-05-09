import { supabase } from "@/integrations/supabase/client";

/** Move conversations to trash (soft delete). Recoverable until 30 days pass. */
export const trashConversations = async (ids: string[]) => {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from("conversations")
    .update({ deleted_at: new Date().toISOString() } as any)
    .in("id", ids);
  if (error) throw error;
};

/** Restore conversations from trash or archive (clears deleted_at + un-archives). */
export const restoreConversations = async (ids: string[]) => {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from("conversations")
    .update({ deleted_at: null, is_archived: false } as any)
    .in("id", ids);
  if (error) throw error;
};

/** Archive (still visible in /archived). */
export const archiveConversations = async (ids: string[]) => {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from("conversations")
    .update({ is_archived: true } as any)
    .in("id", ids);
  if (error) throw error;
};

/** Permanent hard delete. Used by trash "delete forever" / "empty trash". */
export const purgeConversations = async (ids: string[]) => {
  if (ids.length === 0) return;
  const { error } = await supabase.from("conversations").delete().in("id", ids);
  if (error) throw error;
};
