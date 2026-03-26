import { useState, useRef, useEffect, useCallback } from "react";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mic, Users, Phone, Headphones, X, ImageIcon, Info, Mic2, Trash2 } from "lucide-react";
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
import EditContactNameDialog from "@/components/chat/EditContactNameDialog";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";

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
  uploadProgress?: number;
}

interface ReplyTarget {
  id: string;
  text: string;
  senderName: string;
}

const formatMessageTimestamp = (date: Date): string => {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return time;
  if (isYesterday) return `Gestern, ${time}`;
  return `${date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })}, ${time}`;
};

const getPresenceState = (lastSeenStr?: string | null, realtimeOnline?: boolean) => {
  if (realtimeOnline) {
    return { isOnline: true, lastSeen: null as string | null };
  }

  if (!lastSeenStr) {
    return { isOnline: false, lastSeen: null as string | null };
  }

  const seenDate = new Date(lastSeenStr);
  const now = new Date();
  const isToday = seenDate.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = seenDate.toDateString() === yesterday.toDateString();

  let formatted: string;
  if (isToday) {
    formatted = `heute, ${seenDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;
  } else if (isYesterday) {
    formatted = `gestern, ${seenDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;
  } else {
    formatted = `${seenDate.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}, ${seenDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;
  }

  return { isOnline: false, lastSeen: formatted };
};

const ChatPage = () => {
  const { id: conversationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const swipeBack = useSwipeBack({ fallbackPath: "/chats" });
  const scrollRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { locale, t } = useI18n();
  const { autoRead, headphoneAutoPlay, focusMode, isQuietTime, showOnlineStatus, showTypingIndicator } = useAccessibility();
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
  const [contactVoiceProfileId, setContactVoiceProfileId] = useState<string | null>(null);
  const [contactElevenLabsId, setContactElevenLabsId] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [showEditName, setShowEditName] = useState(false);
  const [contactAlias, setContactAlias] = useState<{ firstName: string; lastName: string } | null>(null);

  // Offline queue: swap temp IDs when messages are sent
  const handleOfflineSent = useCallback((tempId: string, realId: string) => {
    setMessages((prev) => {
      const realtimeExists = prev.some((m) => m.id === realId);
      if (realtimeExists) return prev.filter((m) => m.id !== tempId);
      return prev.map((m) => m.id === tempId ? { ...m, id: realId } : m);
    });
  }, []);
  const { enqueue: enqueueOffline } = useOfflineQueue(handleOfflineSent);

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
    if (!user || !conversationId) return false;

    const tempId = crypto.randomUUID();
    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const localAudioUrl = URL.createObjectURL(file);

    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        text: localAudioUrl,
        timestamp: ts,
        isMine: true,
        isRead: false,
        senderId: user.id,
        messageType: "audio",
        uploadProgress: 0,
      },
    ]);

    const filePath = `${user.id}/${conversationId}/${Date.now()}_${file.name}`;

    // Upload with progress tracking via XHR
    const uploadSuccess = await new Promise<boolean>((resolve) => {
      const xhr = new XMLHttpRequest();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const url = `${supabaseUrl}/storage/v1/object/chat-media/${filePath}`;

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setMessages((prev) =>
            prev.map((m) => m.id === tempId ? { ...m, uploadProgress: pct } : m)
          );
        }
      });

      xhr.addEventListener("load", () => {
        resolve(xhr.status >= 200 && xhr.status < 300);
      });
      xhr.addEventListener("error", () => resolve(false));
      xhr.addEventListener("abort", () => resolve(false));

      supabase.auth.getSession().then(({ data }) => {
        const token = data.session?.access_token || anonKey;
        xhr.open("POST", url);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader("apikey", anonKey);
        xhr.setRequestHeader("x-upsert", "false");
        xhr.send(file);
      });
    });

    if (!uploadSuccess) {
      URL.revokeObjectURL(localAudioUrl);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error("Upload fehlgeschlagen");
      return false;
    }

    // Set to 100% while we insert the DB row
    setMessages((prev) =>
      prev.map((m) => m.id === tempId ? { ...m, uploadProgress: 100 } : m)
    );

    const { data: urlData } = supabase.storage
      .from("chat-media")
      .getPublicUrl(filePath);

    const audioUrl = urlData.publicUrl;

    const { data: inserted, error: insertError } = await supabase
      .from("messages")
      .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: audioUrl,
      message_type: "audio",
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      URL.revokeObjectURL(localAudioUrl);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error("Sprachnachricht konnte nicht gesendet werden");
      return false;
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === tempId
          ? { ...m, id: inserted.id, text: audioUrl, uploadProgress: undefined }
          : m
      )
    );

    URL.revokeObjectURL(localAudioUrl);

    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return true;
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

      // Load members and messages in parallel
      const [membersRes, msgsRes] = await Promise.all([
        supabase
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", conversationId),
        supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true }),
      ]);

      const members = membersRes.data;

      if (conv.is_group && conv.name) {
        setChatName(conv.name);
        if (members) {
          const otherIds = members.filter((m) => m.user_id !== user.id).map((m) => m.user_id);
          if (otherIds.length > 0) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, display_name, phone_number")
              .in("id", otherIds);
            const names: Record<string, string> = {};
            profiles?.forEach((p) => { names[p.id] = p.display_name || p.phone_number; });
            setMemberNames(names);
          }
        }
      } else {
        const otherMember = members?.find((m) => m.user_id !== user.id);
        if (otherMember) {
          setOtherUserId(otherMember.user_id);
          const [profileRes, presenceRes] = await Promise.all([
            supabase.from("profiles").select("display_name, phone_number").eq("id", otherMember.user_id).maybeSingle(),
            supabase.from("user_presence").select("is_online, last_seen").eq("user_id", otherMember.user_id).maybeSingle(),
          ]);
          const profile = profileRes.data;
          const { data: alias } = await supabase
            .from("contact_aliases" as any)
            .select("first_name, last_name")
            .eq("user_id", user.id)
            .eq("contact_user_id", otherMember.user_id)
            .maybeSingle();
          const a = alias as any;
          if (a?.first_name) {
            const fullName = [a.first_name, a.last_name].filter(Boolean).join(" ");
            setChatName(fullName);
            setMemberNames({ [otherMember.user_id]: fullName });
            setContactAlias({ firstName: a.first_name || "", lastName: a.last_name || "" });
          } else {
            setChatName(profile?.display_name || profile?.phone_number || "Chat");
            setMemberNames({ [otherMember.user_id]: profile?.display_name || profile?.phone_number || "" });
            setContactAlias(null);
          }
          const presence = presenceRes.data;
          if (presence) {
            const presenceState = getPresenceState((presence as any).last_seen, (presence as any).is_online);
            setIsOnline(showOnlineStatus ? presenceState.isOnline : false);
            setLastSeen(showOnlineStatus ? presenceState.lastSeen : null);
          }
        }
      }

      const msgs = msgsRes.data;
      if (msgs) {
        setMessages(
          msgs.map((m) => ({
            id: m.id,
            text: m.content,
            timestamp: formatMessageTimestamp(new Date(m.created_at)),
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
      // Check voice profiles in parallel
      await Promise.all(senderIds.map(async (sid) => {
        const { data: contactVp } = await supabase
          .from("contact_voice_profiles" as any)
          .select("id, elevenlabs_voice_id")
          .eq("user_id", user.id)
          .eq("contact_user_id", sid)
          .maybeSingle();
        if (contactVp) {
          profiles[sid] = true;
          setContactVoiceProfileId((contactVp as any).id);
          setContactElevenLabsId((contactVp as any).elevenlabs_voice_id);
          return;
        }
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
      }));

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
            timestamp: formatMessageTimestamp(new Date(m.created_at)),
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
            // Skip own messages from realtime – they're already shown via optimistic update
            if (newMsg.isMine) return prev;
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

  // Presence is handled globally in usePresence hook (App-level)

  // Watch other user's presence via DB changes (written by their usePresence hook)
  useEffect(() => {
    if (!otherUserId) return;

    const channel = supabase
      .channel(`presence-watch-${otherUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
          filter: `user_id=eq.${otherUserId}`,
        },
        (payload) => {
          const p = payload.new as any;
          if (!p) return;
          const presenceState = getPresenceState(p.last_seen, p.is_online);
          setIsOnline(showOnlineStatus ? presenceState.isOnline : false);
          setLastSeen(showOnlineStatus ? presenceState.lastSeen : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [otherUserId, showOnlineStatus]);

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
      // Reload contact voice profile info
      const { data: newProfile } = await supabase
        .from("contact_voice_profiles")
        .select("id, elevenlabs_voice_id")
        .eq("user_id", user.id)
        .eq("contact_user_id", contactSenderId)
        .maybeSingle();
      if (newProfile) {
        setContactVoiceProfileId(newProfile.id);
        setContactElevenLabsId(newProfile.elevenlabs_voice_id);
      }
    } catch (err) {
      console.error("Save voice sample error:", err);
      const { toast } = await import("sonner");
      toast.error("Stimmprobe konnte nicht gespeichert werden");
    }
  };

  // Delete contact voice profile
  const handleDeleteContactVoice = async () => {
    if (!user || !contactVoiceProfileId || !contactElevenLabsId || !otherUserId) return;
    try {
      toast.info("Stimmprobe wird gelöscht…");
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-voice`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            elevenlabs_voice_id: contactElevenLabsId,
            type: "contact",
            contact_voice_id: contactVoiceProfileId,
          }),
        }
      );

      if (!res.ok) throw new Error("Delete failed");

      setVoiceProfiles((prev) => ({ ...prev, [otherUserId]: false }));
      setOtherHasVoice(false);
      setContactVoiceProfileId(null);
      setContactElevenLabsId(null);
      toast.success("Stimmprobe gelöscht. Du kannst jetzt eine neue speichern.");
    } catch (err) {
      console.error("Delete contact voice error:", err);
      toast.error("Stimmprobe konnte nicht gelöscht werden");
    }
  };

  const handleSaveContactName = async (firstName: string, lastName: string) => {
    if (!user || !otherUserId) return;
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    try {
      const { error } = await supabase
        .from("contact_aliases" as any)
        .upsert({
          user_id: user.id,
          contact_user_id: otherUserId,
          first_name: firstName || null,
          last_name: lastName || null,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: "user_id,contact_user_id" });
      if (error) throw error;
      setChatName(fullName || "Chat");
      setMemberNames((prev) => ({ ...prev, [otherUserId]: fullName }));
      setContactAlias({ firstName, lastName });
      toast.success("Name gespeichert");
    } catch (err) {
      console.error("Save alias error:", err);
      toast.error("Name konnte nicht gespeichert werden");
    }
  };

  const handleSend = async (text: string) => {
    if (isListening) stop();
    if (!user || !conversationId) return;

    // Optimistic update
    const tempId = crypto.randomUUID();
    const ts = formatMessageTimestamp(new Date());
    const optimisticMsg: Message = { id: tempId, text, timestamp: ts, isMine: true, isRead: false, senderId: user.id, messageType: "text", replyTo: replyTarget?.id };
    setMessages((prev) => [...prev, optimisticMsg]);

    // Insert into DB
    const insertData: any = {
      conversation_id: conversationId,
      sender_id: user.id,
      content: text,
      message_type: "text",
    };
    if (replyTarget) insertData.reply_to = replyTarget.id;
    setReplyTarget(null);

    if (!navigator.onLine) {
      // Queue for later
      enqueueOffline({
        tempId,
        conversationId,
        senderId: user.id,
        content: text,
        messageType: "text",
        replyTo: replyTarget?.id || undefined,
        queuedAt: Date.now(),
      });
      return;
    }

    try {
      const { data: inserted, error } = await supabase.from("messages").insert(insertData).select("id").single();

      if (error) {
        // Network error during send – queue it
        enqueueOffline({
          tempId,
          conversationId,
          senderId: user.id,
          content: text,
          messageType: "text",
          replyTo: replyTarget?.id || undefined,
          queuedAt: Date.now(),
        });
      } else if (inserted) {
        setMessages((prev) => {
          const realtimeExists = prev.some((m) => m.id === inserted.id);
          if (realtimeExists) return prev.filter((m) => m.id !== tempId);
          return prev.map((m) => m.id === tempId ? { ...m, id: inserted.id } : m);
        });
        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversationId);
      }
    } catch {
      enqueueOffline({
        tempId,
        conversationId,
        senderId: user.id,
        content: text,
        messageType: "text",
        replyTo: replyTarget?.id || undefined,
        queuedAt: Date.now(),
      });
    }
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
    <div className="flex flex-col h-screen bg-background" {...swipeBack}>
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
            <h2
              className="font-semibold text-base truncate cursor-pointer hover:text-primary transition-colors"
              onClick={() => !isGroup && setShowEditName(true)}
              title={!isGroup ? "Name bearbeiten" : undefined}
            >
              {chatName}
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              {typingNames.length > 0 && showTypingIndicator ? (
                <span className="text-primary font-medium flex items-center gap-1">
                  {typingNames.join(", ")} schreibt
                  <span className="inline-flex gap-0.5 ml-0.5">
                    <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </span>
              ) : isListening ? (
                <span className="text-accent font-medium flex items-center gap-1">
                  <Mic className="w-3 h-3" /> {t("chat.recording")}
                </span>
              ) : isGroup ? (
                `${Object.keys(memberNames).length + 1} Mitglieder`
              ) : isOnline && showOnlineStatus ? (
                t("chat.online")
              ) : lastSeen && showOnlineStatus ? (
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
            Noch keine Stimmprobe von <strong className="text-foreground">{chatName}</strong>. Doppeltippe auf eine Sprachnachricht und speichere sie als Stimmprobe.
          </p>
        </div>
      )}
      {!isGroup && otherHasVoice === true && (
        <div className="flex items-center gap-2.5 px-4 py-2 bg-primary/5 border-b border-border/50">
          <Mic2 className="w-4 h-4 text-primary shrink-0" />
          <p className="flex-1 text-[11px] text-muted-foreground leading-snug">
            Stimmprobe von <strong className="text-foreground">{chatName}</strong> aktiv – tippe auf Nachrichten zum Anhören.
          </p>
          <button
            onClick={handleDeleteContactVoice}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors active:scale-95"
          >
            <Trash2 className="w-3 h-3" />
            Löschen
          </button>
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
                  uploadProgress={msg.uploadProgress}
                  isSpeaking={false}
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

      {/* Typing indicator */}
      {typingNames.length > 0 && showTypingIndicator && (
        <div className="px-5 py-2 flex items-center gap-2">
          <div className="flex gap-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-xs text-muted-foreground italic">
            {typingNames.join(", ")} {typingNames.length === 1 ? "schreibt" : "schreiben"}…
          </span>
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
        onTyping={showTypingIndicator ? sendTyping : undefined}
        onStopTyping={showTypingIndicator ? clearTyping : undefined}
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

      {!isGroup && otherUserId && (
        <EditContactNameDialog
          open={showEditName}
          onOpenChange={setShowEditName}
          currentFirstName={contactAlias?.firstName || chatName.split(" ")[0] || ""}
          currentLastName={contactAlias?.lastName || chatName.split(" ").slice(1).join(" ") || ""}
          onSave={handleSaveContactName}
        />
      )}
    </div>
  );
};

export default ChatPage;
