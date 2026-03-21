import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MoreVertical, Mic, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import ChatBubble from "@/components/chat/ChatBubble";
import ChatInput from "@/components/chat/ChatInput";
import useSpeechRecognition from "@/hooks/useSpeechRecognition";
import useTextToSpeech from "@/hooks/useTextToSpeech";
import { useVoiceTTS } from "@/hooks/useVoiceTTS";
import { useI18n, localeSpeechCodes } from "@/contexts/I18nContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useHeadphoneDetection } from "@/hooks/useHeadphoneDetection";
import { useSubscription } from "@/hooks/useSubscription";

interface Message {
  id: string;
  text: string;
  timestamp: string;
  isMine: boolean;
  isRead: boolean;
  senderId: string;
  messageType: string;
  mediaUrl?: string;
}

const ChatPage = () => {
  const { id: conversationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { locale, t } = useI18n();
  const { autoRead, headphoneAutoPlay, focusMode, isQuietTime } = useAccessibility();
  const headphonesConnected = useHeadphoneDetection();
  const { isPremium } = useSubscription();
  const [focusContactIds, setFocusContactIds] = useState<string[]>([]);
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [chatName, setChatName] = useState("...");
  const [loading, setLoading] = useState(true);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [isGroup, setIsGroup] = useState(false);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});

  const { isListening, transcript, toggle, stop, isSupported } = useSpeechRecognition(
    localeSpeechCodes[locale]
  );
  const { speak, stop: stopSpeaking, isSpeaking } = useTextToSpeech();
  const { playClonedVoice, playingMsgId, isPlaying: isPlayingCloned } = useVoiceTTS();
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [voiceProfiles, setVoiceProfiles] = useState<Record<string, boolean>>({});

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

      // Get display name & group info
      setIsGroup(conv.is_group ?? false);

      if (conv.is_group && conv.name) {
        setChatName(conv.name);

        // Load all member names for group chat
        const { data: members } = await supabase
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", conversationId);

        if (members) {
          const names: Record<string, string> = {};
          for (const m of members) {
            if (m.user_id === user.id) continue;
            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name, phone_number")
              .eq("id", m.user_id)
              .maybeSingle();
            if (profile) {
              names[m.user_id] = profile.display_name || profile.phone_number;
            }
          }
          setMemberNames(names);
        }
      } else {
        const { data: otherMember } = await supabase
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", conversationId)
          .neq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (otherMember) {
          setOtherUserId(otherMember.user_id);
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, phone_number")
            .eq("id", otherMember.user_id)
            .maybeSingle();

          setChatName(profile?.display_name || profile?.phone_number || "Chat");
          setMemberNames({ [otherMember.user_id]: profile?.display_name || profile?.phone_number || "" });

          // Check presence
          const { data: presence } = await supabase
            .from("user_presence")
            .select("is_online, last_seen")
            .eq("user_id", otherMember.user_id)
            .maybeSingle();

          if (presence) {
            setIsOnline(presence.is_online);
            if (!presence.is_online && presence.last_seen) {
              setLastSeen(new Date(presence.last_seen).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }));
            }
          }
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
            isRead: m.is_read ?? false,
            senderId: m.sender_id,
            messageType: m.message_type || "text",
            mediaUrl: m.message_type === "image" || m.message_type === "video"
              ? m.content.startsWith("http") ? m.content : undefined
              : undefined,
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

      // Check which senders have voice profiles with consent
      const senderIds = [...new Set(msgs?.map(m => m.sender_id).filter(id => id !== user.id) || [])];
      const profiles: Record<string, boolean> = {};
      for (const sid of senderIds) {
        const { data: vp } = await supabase
          .from("voice_profiles" as any)
          .select("id")
          .eq("user_id", sid)
          .maybeSingle();
        if (vp) {
          const { data: consent } = await supabase
            .from("voice_consents" as any)
            .select("status")
            .eq("voice_owner_id", sid)
            .eq("granted_to_user_id", user.id)
            .eq("status", "granted")
            .maybeSingle();
          profiles[sid] = !!consent;
        }
      }
      setVoiceProfiles(profiles);
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
            isRead: m.is_read ?? false,
            senderId: m.sender_id,
            messageType: m.message_type || "text",
            mediaUrl: m.message_type === "image" || m.message_type === "video"
              ? m.content.startsWith("http") ? m.content : undefined
              : undefined,
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
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as any;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === m.id ? { ...msg, isRead: m.is_read ?? false } : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  // Presence tracking - set online/offline
  useEffect(() => {
    if (!user) return;

    const setPresence = async (online: boolean) => {
      await supabase.from("user_presence").upsert({
        user_id: user.id,
        is_online: online,
        last_seen: new Date().toISOString(),
      });
    };

    setPresence(true);

    const handleBeforeUnload = () => setPresence(false);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      setPresence(false);
    };
  }, [user]);

  // Listen for other user's presence changes
  useEffect(() => {
    if (!otherUserId) return;

    const channel = supabase
      .channel(`presence-${otherUserId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_presence",
          filter: `user_id=eq.${otherUserId}`,
        },
        (payload) => {
          const p = payload.new as any;
          setIsOnline(p.is_online);
          if (!p.is_online && p.last_seen) {
            setLastSeen(new Date(p.last_seen).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }));
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

  // Load focus contacts
  useEffect(() => {
    if (!user || !focusMode) return;
    const loadFocus = async () => {
      const { data } = await supabase
        .from("focus_contacts" as any)
        .select("contact_user_id")
        .eq("user_id", user.id);
      if (data) setFocusContactIds((data as any[]).map((d: any) => d.contact_user_id));
    };
    loadFocus();
  }, [user, focusMode]);

  // Auto-read new messages from others
  const shouldAutoPlay = autoRead || (headphoneAutoPlay && headphonesConnected && isPremium);
  useEffect(() => {
    if (!shouldAutoPlay || messages.length === 0) return;
    // Smart Silence: no auto-play during quiet hours
    if (isQuietTime()) return;

    const last = messages[messages.length - 1];
    if (last.isMine) return;

    // Focus mode: only read from priority contacts
    if (focusMode && !focusContactIds.includes(last.senderId)) return;

    speak(last.text, localeSpeechCodes[locale]);
  }, [messages.length, shouldAutoPlay, focusMode, focusContactIds]);

  const handleSend = async (text: string) => {
    if (isListening) stop();
    if (!user || !conversationId) return;

    // Optimistic update
    const tempId = crypto.randomUUID();
    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    setMessages((prev) => [...prev, { id: tempId, text, timestamp: ts, isMine: true, isRead: false, senderId: user.id, messageType: "text" }]);

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

  const handleSendMedia = async (file: File, type: "image" | "video", caption?: string) => {
    if (!user || !conversationId) return;

    const tempId = crypto.randomUUID();
    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    // Upload file to storage
    const filePath = `${user.id}/${conversationId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("chat-media")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Upload failed:", uploadError);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("chat-media")
      .getPublicUrl(filePath);

    const mediaUrl = urlData.publicUrl;

    // Optimistic update
    setMessages((prev) => [...prev, {
      id: tempId,
      text: caption || "",
      timestamp: ts,
      isMine: true,
      isRead: false,
      senderId: user.id,
      messageType: type,
      mediaUrl,
    }]);

    // Insert message with media URL as content
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: mediaUrl,
      message_type: type,
    });

    if (error) {
      console.error("Send media failed:", error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }

    // If there's a caption, send it as a separate text message
    if (caption?.trim()) {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: caption.trim(),
        message_type: "text",
      });
    }

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
          <div className="relative w-10 h-10 shrink-0">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm",
              isGroup ? "gradient-primary text-primary-foreground" : "bg-primary/10 text-primary"
            )}>
              {isGroup ? <Users className="w-5 h-5" /> : initials}
            </div>
            {!isGroup && (
              <span
                className={cn(
                  "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card",
                  isOnline ? "bg-success" : "bg-muted-foreground/40"
                )}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-[0.938rem] truncate">{chatName}</h2>
            <p className="text-xs text-muted-foreground truncate">
              {isListening ? (
                <span className="text-accent font-medium flex items-center gap-1">
                  <Mic className="w-3 h-3" /> {t("chat.recording")}
                </span>
              ) : isGroup ? (
                `${Object.keys(memberNames).length + 1} Mitglieder`
              ) : isOnline ? (
                t("chat.online")
              ) : lastSeen ? (
                `${t("chat.lastSeen") || "Zuletzt"} ${lastSeen}`
              ) : (
                t("chat.offline") || "Offline"
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
              isRead={msg.isRead}
              senderName={isGroup && !msg.isMine ? memberNames[msg.senderId] : undefined}
              onSpeak={(text) => handleSpeak(msg.id, text)}
              isSpeaking={speakingId === msg.id && isSpeaking}
              messageType={msg.messageType}
              mediaUrl={msg.mediaUrl}
              senderId={msg.senderId}
              msgId={msg.id}
              hasClonedVoice={!msg.isMine && voiceProfiles[msg.senderId] === true}
              onPlayClonedVoice={playClonedVoice}
              isPlayingCloned={playingMsgId === msg.id && isPlayingCloned}
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
        onSendMedia={handleSendMedia}
        isListening={isListening}
        onVoiceToggle={toggle}
        transcript={transcript}
      />
    </div>
  );
};

export default ChatPage;
