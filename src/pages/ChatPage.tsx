import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MoreVertical, Mic } from "lucide-react";
import ChatBubble from "@/components/chat/ChatBubble";
import ChatInput from "@/components/chat/ChatInput";
import useSpeechRecognition from "@/hooks/useSpeechRecognition";
import useTextToSpeech from "@/hooks/useTextToSpeech";
import { useI18n, localeSpeechCodes } from "@/contexts/I18nContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";

interface Message {
  id: string;
  text: string;
  timestamp: string;
  isMine: boolean;
}

const chatData: Record<string, { name: string; messages: Message[] }> = {
  "1": {
    name: "Lena Müller",
    messages: [
      { id: "1", text: "Hey! Treffen wir uns heute Abend?", timestamp: "14:20", isMine: false },
      { id: "2", text: "Ja klar, wann passt dir?", timestamp: "14:25", isMine: true },
      { id: "3", text: "So um 19 Uhr? Im neuen Restaurant am Marktplatz", timestamp: "14:28", isMine: false },
      { id: "4", text: "Perfekt, bin dabei! 🎉", timestamp: "14:30", isMine: true },
      { id: "5", text: "Klingt super, bis dann! 👋", timestamp: "14:32", isMine: false },
    ],
  },
  "2": {
    name: "Marco Rossi",
    messages: [
      { id: "1", text: "Ciao! Ich hab dir gerade das Dokument geschickt", timestamp: "13:05", isMine: false },
      { id: "2", text: "Hast du das Dokument bekommen?", timestamp: "13:10", isMine: false },
    ],
  },
  "3": {
    name: "Sophie Chen",
    messages: [
      { id: "1", text: "Kommst du am Samstag zur Feier?", timestamp: "18:40", isMine: true },
      { id: "2", text: "Ja auf jeden Fall! Wo genau?", timestamp: "18:45", isMine: false },
      { id: "3", text: "Ich schick dir die Adresse", timestamp: "18:46", isMine: false },
    ],
  },
  "4": {
    name: "Ahmed Hassan",
    messages: [
      { id: "1", text: "Danke für die Hilfe!", timestamp: "16:30", isMine: false },
    ],
  },
  "5": {
    name: "Projekt-Gruppe",
    messages: [
      { id: "1", text: "Alles klar, machen wir", timestamp: "10:00", isMine: false },
    ],
  },
};

const ChatPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const chat = chatData[id || ""] || { name: "Unbekannt", messages: [] };
  const { locale, t } = useI18n();
  const { autoRead } = useAccessibility();

  const [messages, setMessages] = useState<Message[]>(chat.messages);
  const { isListening, transcript, toggle, stop, isSupported } = useSpeechRecognition(
    localeSpeechCodes[locale]
  );
  const { speak, stop: stopSpeaking, isSpeaking } = useTextToSpeech();
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const initials = chat.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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

  const handleSend = (text: string) => {
    if (isListening) stop();
    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text, timestamp: ts, isMine: true },
    ]);
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
            <h2 className="font-semibold text-[0.938rem] truncate">{chat.name}</h2>
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
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            message={msg.text}
            timestamp={msg.timestamp}
            isMine={msg.isMine}
            onSpeak={(text) => handleSpeak(msg.id, text)}
            isSpeaking={speakingId === msg.id && isSpeaking}
          />
        ))}
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
