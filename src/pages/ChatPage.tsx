import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MoreVertical, Mic } from "lucide-react";
import ChatBubble from "@/components/chat/ChatBubble";
import ChatInput from "@/components/chat/ChatInput";
import useSpeechRecognition from "@/hooks/useSpeechRecognition";
import useTextToSpeech from "@/hooks/useTextToSpeech";
import { useI18n, localeSpeechCodes } from "@/contexts/I18nContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  text: string;
  timestamp: string;
  isMine: boolean;
  isRead: boolean;
}

const ChatPage = () => {
  const { id: conversationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { locale, t } = useI18n();
  const { autoRead } = useAccessibility();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [chatName, setChatName] = useState("...");
  const [loading, setLoading] = useState(true);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  const { isListening, transcript, toggle, stop, isSupported } = useSpeechRecognition(
    localeSpeechCodes[locale]
  );
  const { speak, stop: stopSpeaking, isSpeaking } = useTextToSpeech();
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const initials = chatName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Load conversation info
  useEffect(() => {
    if (!conversationId || !user) return;

    const loadChat = async () => {
      // Get conversation
      const { data: conv } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single();

      if (!conv) {
        navigate("/chats");
        return;
      }

      // Get display name
      if (conv.name) {
        setChatName(conv.name);
      } else {
        const { data: otherMember } = await supabase
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", conversationId)
          .neq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (otherMember) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, phone_number")
            .eq("id", otherMember.user_id)
            .maybeSingle();

          setChatName(profile?.display_name || profile?.phone_number || "Chat");
        }
      }

      // Load messages
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (msgs) {
        setMessages(
          msgs.map((m) => ({
            id: m.id,
            text: m.content,
            timestamp: new Date(m.created_at).toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            isMine: m.sender_id === user.id,
          }))
        );
      }

      // Mark messages as read
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", user.id)
        .eq("is_read", false);

      setLoading(false);
    };

    loadChat();
  }, [conversationId, user]);

  // Realtime messages
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as any;
          const newMsg: Message = {
            id: m.id,
            text: m.content,
            timestamp: new Date(m.created_at).toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            isMine: m.sender_id === user.id,
          };

          setMessages((prev) => {
            if (prev.some((p) => p.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Mark as read if from other user
          if (m.sender_id !== user.id) {
            supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", m.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Auto-read new messages from others
  useEffect(() => {
    if (!autoRead || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (!last.isMine) {
      speak(last.text, localeSpeechCodes[locale]);
    }
  }, [messages.length, autoRead]);

  const handleSend = async (text: string) => {
    if (isListening) stop();
    if (!user || !conversationId) return;

    // Optimistic update
    const tempId = crypto.randomUUID();
    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    setMessages((prev) => [...prev, { id: tempId, text, timestamp: ts, isMine: true }]);

    // Insert into DB
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: text,
      message_type: "text",
    });

    if (error) {
      console.error("Send failed:", error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }

    // Update conversation timestamp
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  };

  const handleSpeak = (msgId: string, text: string) => {
    if (speakingId === msgId && isSpeaking) {
      stopSpeaking();
      setSpeakingId(null);
    } else {
      speak(text, localeSpeechCodes[locale]);
      setSpeakingId(msgId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-3 px-2 py-2.5">
          <button
            onClick={() => navigate("/chats")}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors active:scale-95"
            aria-label={t("a11y.back")}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-[0.938rem] truncate">{chatName}</h2>
            <p className="text-xs text-muted-foreground">
              {isListening ? (
                <span className="text-accent font-medium flex items-center gap-1">
                  <Mic className="w-3 h-3" /> {t("chat.recording")}
                </span>
              ) : (
                t("chat.online")
              )}
            </p>
          </div>
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors active:scale-95"
            aria-label={t("a11y.more")}
          >
            <MoreVertical className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4"
        role="log"
        aria-label={t("chat.chats")}
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {t("chat.noMessages") || "Noch keine Nachrichten. Schreib die erste!"}
          </div>
        ) : (
          messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              message={msg.text}
              timestamp={msg.timestamp}
              isMine={msg.isMine}
              onSpeak={(text) => handleSpeak(msg.id, text)}
              isSpeaking={speakingId === msg.id && isSpeaking}
            />
          ))
        )}
      </div>

      {/* Voice not supported notice */}
      {!isSupported && (
        <div className="px-4 py-2 bg-accent/10 text-accent text-xs text-center" role="alert">
          {t("chat.voiceNotSupported")}
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        isListening={isListening}
        onVoiceToggle={toggle}
        transcript={transcript}
      />
    </div>
  );
};

export default ChatPage;
