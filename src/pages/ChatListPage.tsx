import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Search, Plus } from "lucide-react";
import ChatListItem from "@/components/chat/ChatListItem";
import NewChatDialog from "@/components/chat/NewChatDialog";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";

interface ConversationItem {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
}

const ChatListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const { requestPermission } = useNotifications();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);

  const fetchConversations = async () => {
    if (!user) return;

    // Get conversations the user is a member of
    const { data: memberships } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const convIds = memberships.map((m) => m.conversation_id);

    const { data: convos } = await supabase
      .from("conversations")
      .select("*")
      .in("id", convIds)
      .order("updated_at", { ascending: false });

    if (!convos) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Get last message and unread count for each conversation
    const items: ConversationItem[] = [];
    for (const conv of convos) {
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content, created_at")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .eq("is_read", false)
        .neq("sender_id", user.id);

      // Get other member name for non-group chats
      let displayName = conv.name || "Chat";
      if (!conv.is_group) {
        const { data: otherMembers } = await supabase
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", conv.id)
          .neq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (otherMembers) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, phone_number")
            .eq("id", otherMembers.user_id)
            .maybeSingle();

          if (profile) {
            displayName = profile.display_name || profile.phone_number;
          }
        }
      }

      const timeStr = lastMsg
        ? new Date(lastMsg.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
        : "";

      items.push({
        id: conv.id,
        name: displayName,
        lastMessage: lastMsg?.content || "",
        time: timeStr,
        unread: count || 0,
      });
    }

    setConversations(items);
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();
    requestPermission();
  }, [user]);

  // Realtime: refresh on new messages
  useEffect(() => {
    const channel = supabase
      .channel("chat-list-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleNewChat = () => setShowNewChat(true);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card/90 glass border-b border-border/50">
        <div className="flex items-center justify-between px-5 py-4">
          <h1 className="text-2xl font-extrabold tracking-tight">{t("chat.chats")}</h1>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleNewChat}
              className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-soft transition-all duration-200 active:scale-95"
              aria-label="Neuer Chat"
            >
              <Plus className="w-5 h-5 text-primary-foreground" />
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors active:scale-95"
              aria-label={t("a11y.settings")}
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
        <div className="px-5 pb-3.5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("chat.search")}
              className="w-full h-11 rounded-xl bg-secondary/70 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-card transition-all duration-200"
              aria-label={t("chat.search")}
            />
          </div>
        </div>
      </header>

      <div className="flex-1" role="list" aria-label={t("chat.chats")}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((chat, i) => (
            <div
              key={chat.id}
              className="animate-reveal-up"
              style={{ animationDelay: `${i * 60}ms` }}
              role="listitem"
            >
              <ChatListItem
                name={chat.name}
                lastMessage={chat.lastMessage}
                time={chat.time}
                unread={chat.unread}
                onClick={() => navigate(`/chat/${chat.id}`)}
              />
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-sm">{t("chat.noChats")}</p>
            <button
              onClick={handleNewChat}
              className="mt-4 text-sm text-primary font-medium hover:underline"
            >
              {t("chat.startChat") || "Neuen Chat starten"}
            </button>
          </div>
        )}
      </div>

      <NewChatDialog open={showNewChat} onClose={() => setShowNewChat(false)} />
    </div>
  );
};

export default ChatListPage;
