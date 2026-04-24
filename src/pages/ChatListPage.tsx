import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Search, Plus, MessageSquare, Phone, X, UserPlus } from "lucide-react";
import ChatListItem from "@/components/chat/ChatListItem";
import SwipeableChatListItem from "@/components/chat/SwipeableChatListItem";
import NewChatDialog from "@/components/chat/NewChatDialog";
import PendingInvitations from "@/components/chat/PendingInvitations";
import MessageRequests from "@/components/chat/MessageRequests";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fetchAccessibleProfiles, searchAccessibleProfiles } from "@/lib/accessibleProfiles";
import { findOrCreateDirectChat } from "@/lib/chatCreation";

interface ConversationItem {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar?: string;
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
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [messageResults, setMessageResults] = useState<MessageSearchResult[]>([]);
  const [searchingMessages, setSearchingMessages] = useState(false);
  const [contactResults, setContactResults] = useState<{ id: string; display_name: string | null; avatar_url?: string | null }[]>([]);
  const [searchingContacts, setSearchingContacts] = useState(false);
  const [startingChatWith, setStartingChatWith] = useState<string | null>(null);
  const fetchingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  const cacheKey = user ? `clemio_chats_${user.id}` : "";

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
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
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

      // Fetch conversations, all members, latest messages, and blocked users in parallel
      const [convosRes, allMembersRes, allMessagesRes, blockedRes] = await Promise.all([
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
          .from("blocked_users" as any)
          .select("user_id")
          .eq("blocked_by", user.id),
      ]);

      // Build set of blocked user IDs
      const blockedUserIds = new Set<string>(
        ((blockedRes.data as any[]) || []).map((b: any) => b.user_id)
      );

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

      const profileMap = new Map<string, { display_name: string | null }>();
      if (profileIds.size > 0) {
        const profiles = await fetchAccessibleProfiles(Array.from(profileIds));
        profiles?.forEach((p) => profileMap.set(p.id, p));
      }

      // Fetch aliases for all contacts
      const aliasMap = new Map<string, string>();
      if (profileIds.size > 0) {
        const { data: aliases } = await supabase
          .from("contact_aliases" as any)
          .select("contact_user_id, first_name, last_name")
          .eq("user_id", user.id)
          .in("contact_user_id", Array.from(profileIds));
        (aliases as any[])?.forEach((a: any) => {
          const name = [a.first_name, a.last_name].filter(Boolean).join(" ");
          if (name) aliasMap.set(a.contact_user_id, name);
        });
      }

      const items: ConversationItem[] = convos.filter((conv) => {
        // Hide 1:1 chats with blocked users
        if (!conv.is_group) {
          const otherId = otherMemberMap.get(conv.id);
          if (otherId && blockedUserIds.has(otherId)) return false;
        }
        return true;
      }).map((conv) => {
        let displayName = conv.name || "Chat";
        if (!conv.is_group) {
          const otherId = otherMemberMap.get(conv.id);
          if (otherId) {
            const alias = aliasMap.get(otherId);
            if (alias) {
              displayName = alias;
            } else {
              const profile = profileMap.get(otherId);
              if (profile) displayName = profile.display_name || "Chat";
            }
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
          avatar: (conv as any).avatar_url || undefined,
        };
      });

      setConversations(items);
      setLoading(false);
      try { localStorage.setItem(cacheKey, JSON.stringify(items)); } catch {}
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
      setLoading(false);
    } finally {
      fetchingRef.current = false;
    }
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
    const senderProfiles = await fetchAccessibleProfiles(senderIds);

    const senderMap = new Map<string, { display_name: string | null }>();
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
        senderName: profile?.display_name || "Unbekannt",
      };
    });

    setMessageResults(results);
    setSearchingMessages(false);
  }, [user, conversations]);

  // Search contacts (profiles not yet in a chat with me)
  const searchContacts = useCallback(async (query: string) => {
    if (!user || query.length < 2) {
      setContactResults([]);
      return;
    }
    setSearchingContacts(true);
    try {
      const results = await searchAccessibleProfiles(query.trim());
      setContactResults(results.filter((result) => result.id !== user.id));
    } finally {
      setSearchingContacts(false);
    }
  }, [user]);

  // Start or find existing 1:1 chat with a contact
  const handleStartChatFromSearch = async (target: { id: string; display_name: string | null }) => {
    if (!user || startingChatWith) return;
    setStartingChatWith(target.id);

    try {
      const convId = await findOrCreateDirectChat(user.id, target.id);
      setSearch("");
      navigate(`/chat/${convId}`);
    } catch (err: any) {
      console.error("[ChatListPage] start chat failed", err);
      const msg = err?.message || "";
      if (msg.includes("rate_limited")) {
        toast.error("Zu viele Anfragen. Bitte später erneut versuchen.");
      } else if (msg.includes("request_not_allowed")) {
        toast.error("Anfrage nicht möglich");
      } else if (msg.includes("conversations")) {
        toast.error("Konversation konnte nicht erstellt werden");
      } else if (msg.includes("chat_invitations")) {
        toast.error("Einladung konnte nicht gesendet werden");
      } else if (msg.includes("conversation_members")) {
        toast.error("Mitglied konnte nicht hinzugefügt werden");
      } else {
        toast.error("Chat konnte nicht gestartet werden");
      }
    } finally {
      setStartingChatWith(null);
    }
  };

  useEffect(() => {
    if (!user || lastUserIdRef.current === user.id) return;
    lastUserIdRef.current = user.id;
    fetchConversations();
  }, [user]);

  // Realtime: debounced refresh on new messages + visibility resync
  useEffect(() => {
    if (!user) return;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const triggerRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchConversations();
      }, 300);
    };

    const channel = supabase
      .channel("chat-list-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, triggerRefresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, triggerRefresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations" }, triggerRefresh)
      .subscribe();

    // Resync when tab becomes visible or comes back online
    const handleVisibility = () => {
      if (document.visibilityState === "visible") triggerRefresh();
    };
    const handleOnline = () => triggerRefresh();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
    };
  }, [user]);

  // Debounced message + contact search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.length >= 2) {
        searchMessages(search);
        searchContacts(search);
      } else {
        setMessageResults([]);
        setContactResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, searchMessages, searchContacts]);

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
      <header className="sticky top-0 z-10 glass-strong border-b border-border/30" style={{ background: 'linear-gradient(135deg, hsl(var(--card) / 0.9), hsl(var(--card) / 0.8))' }}>
        <div className="flex items-center justify-between px-5 py-4">
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{t("chat.chats")}</h1>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleNewChat}
              className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-soft transition-all duration-200 active:scale-95"
              aria-label="Neuer Chat"
            >
              <Plus className="w-5 h-5 text-primary-foreground" />
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
          <div className="px-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3.5 animate-pulse">
                <div className="h-12 w-12 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="h-4 rounded bg-muted" style={{ width: `${60 + (i % 3) * 20}px` }} />
                    <div className="h-3 w-10 rounded bg-muted" />
                  </div>
                  <div className="h-3 rounded bg-muted" style={{ width: `${120 + (i % 4) * 30}px` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <MessageRequests />
            <PendingInvitations />
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
                        avatar={chat.avatar}
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

            {/* Contact search results - people not yet in a chat */}
            {search.length >= 2 && (
              <>
                <div className="px-5 pt-4 pb-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Kontakte
                    {searchingContacts && (
                      <span className="ml-2 inline-block w-3 h-3 border border-primary/30 border-t-primary rounded-full animate-spin align-middle" />
                    )}
                  </p>
                </div>
                {contactResults.length > 0 ? (
                  contactResults.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => handleStartChatFromSearch(contact)}
                      disabled={startingChatWith === contact.id}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-secondary/50 active:bg-secondary/70 transition-colors text-left disabled:opacity-50"
                    >
                      {contact.avatar_url ? (
                        <img src={contact.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <UserPlus className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{contact.display_name || "Nutzer"}</p>
                        <p className="text-xs text-muted-foreground">Tippen zum Chatten</p>
                      </div>
                      {startingChatWith === contact.id && (
                        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
                      )}
                    </button>
                  ))
                ) : !searchingContacts ? (
                  <p className="px-5 py-4 text-sm text-muted-foreground">Keine weiteren Kontakte gefunden</p>
                ) : null}
              </>
            )}

            {filtered.length === 0 && messageResults.length === 0 && contactResults.length === 0 && !searchingMessages && !searchingContacts && (
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
