import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mic, Users, Phone, Headphones, X, ImageIcon, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import ChatBubble from "@/components/chat/ChatBubble";
import ChatInput from "@/components/chat/ChatInput";
import SwipeableBubble from "@/components/chat/SwipeableBubble";
import ReplyPreview from "@/components/chat/ReplyPreview";
import BackgroundPicker from "@/components/chat/BackgroundPicker";
import AnimatedChatBackground from "@/components/chat/AnimatedChatBackground";
import useSpeechRecognition from "@/hooks/useSpeechRecognition";
import useTextToSpeech from "@/hooks/useTextToSpeech";
import { useVoiceTTS } from "@/hooks/useVoiceTTS";
import { useI18n, localeSpeechCodes } from "@/contexts/I18nContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useAuth } from "@/contexts/AuthContext";
import { useChatBackground } from "@/contexts/ChatBackgroundContext";
import { supabase } from "@/integrations/supabase/client";
import { useHeadphoneDetection } from "@/hooks/useHeadphoneDetection";
import { useSubscription } from "@/hooks/useSubscription";
import { useAutoPlayQueue } from "@/hooks/useAutoPlayQueue";
import { playMessageTone } from "@/lib/sounds";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useMessageReactions } from "@/hooks/useMessageReactions";
import { toast } from "sonner";

interface Message {
  id: string;
  text: string;
  timestamp: string;
  isMine: boolean;
  isRead: boolean;
  senderId: string;
  messageType: string;
  mediaUrl?: string;
  replyTo?: string;
}

interface ReplyTarget {
  id: string;
  text: string;
  senderName: string;
}

const ChatPage = () => {
  const { id: conversationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { locale, t } = useI18n();
  const { autoRead, headphoneAutoPlay, focusMode, isQuietTime } = useAccessibility();
  const headphonesConnected = useHeadphoneDetection();
  const { isPremium } = useSubscription();
  const [focusContactIds, setFocusContactIds] = useState<string[]>([]);
  const [autoplayContactIds, setAutoplayContactIds] = useState<string[]>([]);
  const { user } = useAuth();
  const { getChatBackground, setChatBackground, clearChatBackground } = useChatBackground();
  const [bgPickerOpen, setBgPickerOpen] = useState(false);

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
  const [otherHasVoice, setOtherHasVoice] = useState<boolean | null>(null);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);

  // Typing indicator
  const { sendTyping, clearTyping, typingNames } = useTypingIndicator(conversationId);

  // Reactions
  const messageIds = messages.map((m) => m.id);
  const { reactions, toggleReaction } = useMessageReactions(messageIds);

  // Delete message
  const handleDeleteMessage = async (msgId: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", msgId);
    if (error) {
      toast.error("Nachricht konnte nicht gelöscht werden");
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    }
  };

  // Voice message
  const handleSendVoiceMessage = async (file: File) => {
    if (!user || !conversationId) return;

    const filePath = `${user.id}/${conversationId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("chat-media")
      .upload(filePath, file);

    if (uploadError) {
      toast.error("Upload fehlgeschlagen");
      return;
    }

    const { data: urlData } = supabase.storage
      .from("chat-media")
      .getPublicUrl(filePath);

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: urlData.publicUrl,
      message_type: "audio",
    });

    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  };

  // Auto-play queue
  const shouldAutoPlay = autoRead || (headphoneAutoPlay && headphonesConnected && isPremium);
  const { enqueue, clearQueue, currentItem, queueLength } = useAutoPlayQueue({
    speak,
    isSpeaking,
    lang: localeSpeechCodes[locale],
    enabled: shouldAutoPlay,
  });

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
            replyTo: (m as any).reply_to || undefined,
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

      // Check which senders have voice profiles (contact-uploaded or own with consent)
      const senderIds = [...new Set(msgs?.map(m => m.sender_id).filter(id => id !== user.id) || [])];
      const profiles: Record<string, boolean> = {};
      for (const sid of senderIds) {
        // Check contact voice profile first (no consent needed - user uploaded it themselves)
        const { data: contactVp } = await supabase
          .from("contact_voice_profiles" as any)
          .select("id")
          .eq("user_id", user.id)
          .eq("contact_user_id", sid)
          .maybeSingle();
        if (contactVp) {
          profiles[sid] = true;
          continue;
        }
        // Fall back to sender's own voice profile with consent
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
      // Track if other user has any voice (contact-uploaded or own)
      if (!isGroup) {
        const otherSid = senderIds[0] || otherUserId;
        if (otherSid) {
          const { data: cvp } = await supabase
            .from("contact_voice_profiles" as any)
            .select("id")
            .eq("user_id", user.id)
            .eq("contact_user_id", otherSid)
            .maybeSingle();
          if (cvp) {
            setOtherHasVoice(true);
          } else {
            const { data: vp } = await supabase
              .from("voice_profiles" as any)
              .select("id")
              .eq("user_id", otherSid)
              .maybeSingle();
            setOtherHasVoice(!!vp);
          }
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

          // Play notification sound & mark as read if from other user
          if (m.sender_id !== user.id) {
            playMessageTone();
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

  // Load per-contact autoplay settings
  useEffect(() => {
    if (!user) return;
    const loadAutoplay = async () => {
      const { data } = await supabase
        .from("contact_autoplay" as any)
        .select("contact_user_id, auto_play")
        .eq("user_id", user.id)
        .eq("auto_play", true);
      if (data) setAutoplayContactIds((data as any[]).map((d: any) => d.contact_user_id));
    };
    loadAutoplay();
  }, [user]);

  // Auto-read new messages from others via queue
  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.isMine) return;

    // Per-contact autoplay always works (independent of global toggle)
    const contactHasAutoplay = autoplayContactIds.includes(last.senderId);

    if (!contactHasAutoplay && !shouldAutoPlay) return;

    // Smart Silence: no auto-play during quiet hours
    if (isQuietTime()) return;

    // Focus mode: only read from priority contacts
    if (focusMode && !focusContactIds.includes(last.senderId)) return;

    const senderName = memberNames[last.senderId] || chatName;
    enqueue({ id: last.id, text: last.text, senderId: last.senderId, senderName });
  }, [messages.length, shouldAutoPlay, focusMode, focusContactIds, autoplayContactIds, enqueue]);

  // Save a voice message audio as a voice sample for a contact
  const handleSaveAsVoiceSample = async (audioUrl: string, contactSenderId: string) => {
    if (!user) return;
    try {
      const { toast } = await import("sonner");
      toast.info("Stimmprobe wird gespeichert…");

      // Fetch the audio file
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const file = new File([blob], "voice-sample.webm", { type: blob.type || "audio/webm" });

      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;

      const formData = new FormData();
      formData.append("audio", file);
      formData.append("name", memberNames[contactSenderId] || chatName || "Kontakt");
      formData.append("contact_user_id", contactSenderId);

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-clone`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: formData,
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Fehler");
      }

      toast.success("Stimmprobe gespeichert! Nachrichten können jetzt in dieser Stimme abgespielt werden. 🎙️");
      // Update voiceProfiles to reflect the new voice
      setVoiceProfiles((prev) => ({ ...prev, [contactSenderId]: true }));
      setOtherHasVoice(true);
    } catch (err) {
      console.error("Save voice sample error:", err);
      const { toast } = await import("sonner");
      toast.error("Stimmprobe konnte nicht gespeichert werden");
    }
  };

  const handleSend = async (text: string) => {
    if (isListening) stop();
    if (!user || !conversationId) return;

    // Optimistic update
    const tempId = crypto.randomUUID();
    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    setMessages((prev) => [...prev, { id: tempId, text, timestamp: ts, isMine: true, isRead: false, senderId: user.id, messageType: "text", replyTo: replyTarget?.id }]);

    // Insert into DB
    const insertData: any = {
      conversation_id: conversationId,
      sender_id: user.id,
      content: text,
      message_type: "text",
    };
    if (replyTarget) insertData.reply_to = replyTarget.id;
    setReplyTarget(null);

    const { error } = await supabase.from("messages").insert(insertData);

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
        <div className="flex items-center gap-3 px-3 py-3">
          <button
            onClick={() => navigate("/chats")}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors active:scale-90"
            aria-label={t("a11y.back")}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="relative w-11 h-11 shrink-0">
            <div className={cn(
              "w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm",
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
            <h2 className="font-semibold text-base truncate">{chatName}</h2>
            <p className="text-xs text-muted-foreground truncate">
              {typingNames.length > 0 ? (
                <span className="text-primary font-medium">
                  {typingNames.join(", ")} schreibt…
                </span>
              ) : isListening ? (
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
            onClick={() => setBgPickerOpen(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors active:scale-90"
            aria-label="Hintergrund ändern"
          >
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          </button>
          <button
            onClick={() => navigate(`/call/${conversationId}`)}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary transition-colors active:scale-90"
            aria-label="Anrufen"
          >
            <Phone className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Auto-play banner */}
      {/* Voice hint: contact has no voice profile */}
      {!isGroup && otherHasVoice === false && isPremium && (
        <div className="flex items-center gap-2.5 px-4 py-2 bg-accent/5 border-b border-border/50">
          <Info className="w-4 h-4 text-accent shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-snug">
            <strong className="text-foreground">{chatName}</strong> hat noch keine Stimme hinterlegt. Jeder Kontakt kann seine Stimme in seinem eigenen Profil aufnehmen.
          </p>
        </div>
      )}
      {currentItem && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border-b border-border animate-fade-in">
          <Headphones className="w-4 h-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              {currentItem.senderName || chatName} spricht…
            </p>
            {queueLength > 0 && (
              <p className="text-[10px] text-muted-foreground">
                +{queueLength} weitere Nachricht{queueLength > 1 ? "en" : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 mr-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="w-0.5 rounded-full bg-primary wave-bar"
                style={{
                  height: "14px",
                  animationDelay: `${i * 0.12}s`,
                }}
              />
            ))}
          </div>
          <button
            onClick={() => { stopSpeaking(); clearQueue(); setSpeakingId(null); }}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
            aria-label="Auto-Play stoppen"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4 bg-cover bg-center bg-no-repeat relative"
        role="log"
        aria-label={t("chat.chats")}
        aria-live="polite"
        style={(() => {
          const bg = conversationId ? getChatBackground(conversationId) : { type: "none" as const, value: "" };
          if (bg.type === "gradient" || bg.type === "color") return { background: bg.value };
          if (bg.type === "image") return { backgroundImage: `url(${bg.value})`, backgroundSize: "cover", backgroundPosition: "center" };
          return {};
        })()}
        onTouchStart={() => {
          longPressTimer.current = setTimeout(() => setBgPickerOpen(true), 600);
        }}
        onTouchEnd={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
        onTouchMove={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
      >
        {/* Animated background layer */}
        {conversationId && getChatBackground(conversationId).type === "animated" && (
          <AnimatedChatBackground animation={getChatBackground(conversationId).value} />
        )}
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {t("chat.noMessages") || "Noch keine Nachrichten. Schreib die erste!"}
          </div>
        ) : (
          messages.map((msg) => {
            const replyMsg = msg.replyTo ? messages.find(m => m.id === msg.replyTo) : undefined;
            const senderName = msg.isMine ? "Du" : (memberNames[msg.senderId] || chatName);
            return (
              <SwipeableBubble
                key={msg.id}
                isMine={msg.isMine}
                onSwipeReply={() => setReplyTarget({
                  id: msg.id,
                  text: msg.text.slice(0, 100),
                  senderName,
                })}
              >
                <ChatBubble
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
                  reactions={reactions[msg.id] || []}
                  onToggleReaction={toggleReaction}
                  onDelete={msg.isMine ? handleDeleteMessage : undefined}
                  onSaveAsVoiceSample={!msg.isMine ? handleSaveAsVoiceSample : undefined}
                  replyToText={replyMsg?.text}
                  replyToSender={replyMsg ? (replyMsg.isMine ? "Du" : (memberNames[replyMsg.senderId] || chatName)) : undefined}
                />
              </SwipeableBubble>
            );
          })
        )}
      </div>

      {/* Voice not supported notice */}
      {!isSupported && (
        <div className="px-4 py-2 bg-accent/10 text-accent text-xs text-center" role="alert">
          {t("chat.voiceNotSupported")}
        </div>
      )}

      {/* Reply preview */}
      {replyTarget && (
        <ReplyPreview
          senderName={replyTarget.senderName}
          text={replyTarget.text}
          onClear={() => setReplyTarget(null)}
        />
      )}

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onSendMedia={handleSendMedia}
        onSendVoice={handleSendVoiceMessage}
        isListening={isListening}
        onVoiceToggle={toggle}
        transcript={transcript}
        onTyping={sendTyping}
        onStopTyping={clearTyping}
      />

      {/* Background picker */}
      {conversationId && (
        <BackgroundPicker
          open={bgPickerOpen}
          onClose={() => setBgPickerOpen(false)}
          current={getChatBackground(conversationId)}
          onSelect={(bg) => setChatBackground(conversationId, bg)}
          onReset={() => clearChatBackground(conversationId)}
          showReset={true}
        />
      )}
    </div>
  );
};

export default ChatPage;
