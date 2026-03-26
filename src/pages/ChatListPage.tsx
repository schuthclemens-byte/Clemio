import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Search, Plus, MessageSquare, X } from "lucide-react";
import ChatListItem from "@/components/chat/ChatListItem";
import SwipeableChatListItem from "@/components/chat/SwipeableChatListItem";
import NewChatDialog from "@/components/chat/NewChatDialog";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConversationItem {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
}

interface MessageSearchResult {
  messageId: string;
  conversationId: string;
  conversationName: string;
  content: string;
  time: string;
  senderName: string;
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
  const [messageResults, setMessageResults] = useState<MessageSearchResult[]>([]);
  const [searchingMessages, setSearchingMessages] = useState(false);
  const fetchingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  const cacheKey = user ? `clevara_chats_${user.id}` : "";

  // Load cached conversations instantly on mount
  useEffect(() => {
    if (!cacheKey) return;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as ConversationItem[];
        if (parsed.length > 0) {
          setConversations(parsed);
          setLoading(false);
        }
      }
    } catch {}
  }, [cacheKey]);

  const fetchConversations = async () => {
    if (!user) return;

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

    // Fetch conversations, all members, and latest messages in parallel
    const [convosRes, allMembersRes, allMessagesRes, unreadRes] = await Promise.all([
      supabase
        .from("conversations")
        .select("*")
        .in("id", convIds)
        .eq("is_archived", false)
        .order("updated_at", { ascending: false }),
      supabase
        .from("conversation_members")
        .select("conversation_id, user_id")
        .in("conversation_id", convIds)
        .neq("user_id", user.id),
      supabase
        .from("messages")
        .select("conversation_id, content, created_at, message_type, sender_id, is_read")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("messages")
        .select("conversation_id", { count: "exact" })
        .in("conversation_id", convIds)
        .eq("is_read", false)
        .neq("sender_id", user.id),
    ]);

    const convos = convosRes.data;
    if (!convos || convos.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Build lookup: convId -> other member user_id
    const otherMemberMap = new Map<string, string>();
    allMembersRes.data?.forEach((m) => {
      if (!otherMemberMap.has(m.conversation_id)) {
        otherMemberMap.set(m.conversation_id, m.user_id);
      }
    });

    // Build lookup: convId -> latest message
    const latestMsgMap = new Map<string, { content: string; created_at: string; message_type: string | null }>();
    allMessagesRes.data?.forEach((msg) => {
      if (!latestMsgMap.has(msg.conversation_id)) {
        latestMsgMap.set(msg.conversation_id, msg);
      }
    });

    // Build lookup: convId -> unread count
    const unreadMap = new Map<string, number>();
    allMessagesRes.data?.forEach((msg) => {
      if (!msg.is_read && msg.sender_id !== user.id) {
        unreadMap.set(msg.conversation_id, (unreadMap.get(msg.conversation_id) || 0) + 1);
      }
    });

    // Batch-fetch all needed profiles at once
    const profileIds = new Set<string>();
    convos.forEach((conv) => {
      if (!conv.is_group) {
        const otherId = otherMemberMap.get(conv.id);
        if (otherId) profileIds.add(otherId);
      }
    });

    const profileMap = new Map<string, { display_name: string | null; phone_number: string }>();
    if (profileIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, phone_number")
        .in("id", Array.from(profileIds));
      profiles?.forEach((p) => profileMap.set(p.id, p));
    }

    const items: ConversationItem[] = convos.map((conv) => {
      let displayName = conv.name || "Chat";
      if (!conv.is_group) {
        const otherId = otherMemberMap.get(conv.id);
        if (otherId) {
          const profile = profileMap.get(otherId);
          if (profile) displayName = profile.display_name || profile.phone_number;
        }
      }

      const lastMsg = latestMsgMap.get(conv.id);
      const lastMessageDisplay = lastMsg
        ? lastMsg.message_type === "audio"
          ? "🎤 Sprachnachricht"
          : lastMsg.message_type === "image"
            ? "📷 Bild"
            : lastMsg.message_type === "video"
              ? "🎥 Video"
              : lastMsg.content
        : "";

      return {
        id: conv.id,
        name: displayName,
        lastMessage: lastMessageDisplay,
        time: lastMsg
          ? new Date(lastMsg.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
          : "",
        unread: unreadMap.get(conv.id) || 0,
      };
    });

    setConversations(items);
    setLoading(false);
    try { localStorage.setItem(cacheKey, JSON.stringify(items)); } catch {}
  };

  // Search messages across all conversations
  const searchMessages = useCallback(async (query: string) => {
    if (!user || query.length < 2) {
      setMessageResults([]);
      return;
    }
    setSearchingMessages(true);

    const { data: memberships } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      setMessageResults([]);
      setSearchingMessages(false);
      return;
    }

    const convIds = memberships.map((m) => m.conversation_id);

    const { data: msgs } = await supabase
      .from("messages")
      .select("id, content, created_at, sender_id, conversation_id")
      .in("conversation_id", convIds)
      .ilike("content", `%${query}%`)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!msgs || msgs.length === 0) {
      setMessageResults([]);
      setSearchingMessages(false);
      return;
    }

    // Batch-fetch sender profiles
    const senderIds = [...new Set(msgs.map((m) => m.sender_id))];
    const { data: senderProfiles } = await supabase
      .from("profiles")
      .select("id, display_name, phone_number")
      .in("id", senderIds);

    const senderMap = new Map<string, { display_name: string | null; phone_number: string }>();
    senderProfiles?.forEach((p) => senderMap.set(p.id, p));

    const results: MessageSearchResult[] = msgs.map((msg) => {
      const conv = conversations.find((c) => c.id === msg.conversation_id);
      const profile = senderMap.get(msg.sender_id);
      return {
        messageId: msg.id,
        conversationId: msg.conversation_id,
        conversationName: conv?.name || "Chat",
        content: msg.content,
        time: new Date(msg.created_at!).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
        senderName: profile?.display_name || profile?.phone_number || "Unbekannt",
      };
    });

    setMessageResults(results);
    setSearchingMessages(false);
  }, [user, conversations]);

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

  // Debounced message search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.length >= 2) {
        searchMessages(search);
      } else {
        setMessageResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, searchMessages]);

  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleNewChat = () => setShowNewChat(true);

  const handleDeleteConversation = async (convId: string) => {
    const { error } = await supabase.from("conversations").delete().eq("id", convId);
    if (error) {
      toast.error("Chat konnte nicht gelöscht werden");
    } else {
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      toast.success("Chat gelöscht");
    }
  };

  const handleArchiveConversation = async (convId: string) => {
    const { error } = await supabase
      .from("conversations")
      .update({ is_archived: true } as any)
      .eq("id", convId);
    if (error) {
      toast.error("Archivieren fehlgeschlagen");
    } else {
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      toast.success("Chat archiviert");
    }
  };

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
              className="w-full h-11 rounded-xl bg-secondary/70 pl-10 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-card transition-all duration-200"
              aria-label={t("chat.search")}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted-foreground/20 flex items-center justify-center"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1" role="list" aria-label={t("chat.chats")}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {filtered.length > 0 && (
              <>
                {search.length >= 2 && (
                  <div className="px-5 pt-3 pb-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Chats</p>
                  </div>
                )}
                {filtered.map((chat, i) => (
                  <SwipeableChatListItem
                    key={chat.id}
                    onDelete={() => handleDeleteConversation(chat.id)}
                    onArchive={() => handleArchiveConversation(chat.id)}
                  >
                    <div
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
                  </SwipeableChatListItem>
                ))}
              </>
            )}

            {search.length >= 2 && (
              <>
                <div className="px-5 pt-4 pb-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Nachrichten
                    {searchingMessages && (
                      <span className="ml-2 inline-block w-3 h-3 border border-primary/30 border-t-primary rounded-full animate-spin align-middle" />
                    )}
                  </p>
                </div>
                {messageResults.length > 0 ? (
                  messageResults.map((result) => (
                    <button
                      key={result.messageId}
                      onClick={() => navigate(`/chat/${result.conversationId}`)}
                      className="w-full flex items-start gap-3 px-5 py-3 hover:bg-secondary/50 active:bg-secondary/70 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                        <MessageSquare className="w-4 h-4 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{result.senderName}</p>
                          <span className="text-[11px] text-muted-foreground shrink-0">{result.time}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{result.conversationName}</p>
                        <p className="text-sm text-foreground/80 line-clamp-2 mt-0.5">{result.content}</p>
                      </div>
                    </button>
                  ))
                ) : !searchingMessages ? (
                  <p className="px-5 py-4 text-sm text-muted-foreground">Keine Nachrichten gefunden</p>
                ) : null}
              </>
            )}

            {filtered.length === 0 && messageResults.length === 0 && !searchingMessages && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <p className="text-sm">{search ? "Keine Ergebnisse" : t("chat.noChats")}</p>
                {!search && (
                  <button
                    onClick={handleNewChat}
                    className="mt-4 text-sm text-primary font-medium hover:underline"
                  >
                    {t("chat.startChat") || "Neuen Chat starten"}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <NewChatDialog open={showNewChat} onClose={() => setShowNewChat(false)} />
    </div>
  );
};

export default ChatListPage;
