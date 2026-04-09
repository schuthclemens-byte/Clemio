import { useState, useEffect } from "react";
import { X, Search, Forward } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAccessibleProfiles } from "@/lib/accessibleProfiles";
import { toast } from "sonner";

interface ConversationOption {
  id: string;
  name: string;
}

interface ForwardMessageDialogProps {
  open: boolean;
  onClose: () => void;
  messageContent: string;
  messageType?: string;
}

const ForwardMessageDialog = ({ open, onClose, messageContent, messageType = "text" }: ForwardMessageDialogProps) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [forwarding, setForwarding] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    (async () => {
      const { data: memberships } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (!memberships?.length) { setLoading(false); return; }

      const convIds = memberships.map((m) => m.conversation_id);

      const [convosRes, allMembersRes] = await Promise.all([
        supabase.from("conversations").select("id, name, is_group").in("id", convIds).eq("is_archived", false),
        supabase.from("conversation_members").select("conversation_id, user_id").in("conversation_id", convIds).neq("user_id", user.id),
      ]);

      const otherMemberMap = new Map<string, string>();
      allMembersRes.data?.forEach((m) => {
        if (!otherMemberMap.has(m.conversation_id)) otherMemberMap.set(m.conversation_id, m.user_id);
      });

      const profileIds = [...new Set(allMembersRes.data?.map((m) => m.user_id) || [])];
      const profiles = profileIds.length > 0 ? await fetchAccessibleProfiles(profileIds) : [];
      const profileMap = new Map(profiles.map((p) => [p.id, p.display_name || "Nutzer"]));

      const items: ConversationOption[] = (convosRes.data || []).map((c) => ({
        id: c.id,
        name: c.is_group
          ? (c.name || "Gruppe")
          : (profileMap.get(otherMemberMap.get(c.id) || "") || "Chat"),
      }));

      setConversations(items);
      setLoading(false);
    })();
  }, [open, user]);

  const handleForward = async (targetConvId: string) => {
    if (!user || forwarding) return;
    setForwarding(targetConvId);

    const forwardedContent = messageType === "text"
      ? `⤵️ Weitergeleitet:\n${messageContent}`
      : messageContent;

    const { error } = await supabase.from("messages").insert({
      conversation_id: targetConvId,
      sender_id: user.id,
      content: forwardedContent,
      message_type: messageType,
    });

    // Update conversation timestamp
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", targetConvId);

    if (error) {
      toast.error("Weiterleiten fehlgeschlagen");
    } else {
      toast.success("Nachricht weitergeleitet");
      onClose();
    }
    setForwarding(null);
  };

  if (!open) return null;

  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl animate-reveal-up max-h-[75vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Forward className="w-5 h-5" />
            Weiterleiten
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-4 pt-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Chat suchen..."
              className="w-full h-10 rounded-xl bg-secondary pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>
        </div>

        <div className="p-4 space-y-1 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Keine Chats gefunden</p>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleForward(conv.id)}
                disabled={forwarding === conv.id}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/60 transition-colors text-left disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                  {conv.name[0].toUpperCase()}
                </div>
                <p className="flex-1 text-sm font-medium truncate">{conv.name}</p>
                {forwarding === conv.id ? (
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
                ) : (
                  <Forward className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ForwardMessageDialog;
