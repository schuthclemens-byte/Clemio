import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export interface ChatBackground {
  type: "none" | "gradient" | "color" | "image" | "animated";
  value: string; // CSS gradient, color, image URL, or animation key
}

interface ChatBackgroundContextType {
  globalBackground: ChatBackground;
  setGlobalBackground: (bg: ChatBackground) => void;
  getChatBackground: (chatId: string) => ChatBackground;
  setChatBackground: (chatId: string, bg: ChatBackground) => void;
  clearChatBackground: (chatId: string) => void;
}

const defaultBg: ChatBackground = { type: "none", value: "" };

const ChatBackgroundContext = createContext<ChatBackgroundContextType | undefined>(undefined);

export const useChatBackground = () => {
  const ctx = useContext(ChatBackgroundContext);
  if (!ctx) throw new Error("useChatBackground must be used within ChatBackgroundProvider");
  return ctx;
};

export const backgroundPresets: { label: string; bg: ChatBackground }[] = [
  { label: "Standard", bg: { type: "none", value: "" } },
  { label: "Sunset", bg: { type: "gradient", value: "linear-gradient(135deg, hsl(45,100%,90%) 0%, hsl(18,90%,85%) 50%, hsl(340,75%,88%) 100%)" } },
  { label: "Ozean", bg: { type: "gradient", value: "linear-gradient(135deg, hsl(200,80%,90%) 0%, hsl(220,70%,85%) 50%, hsl(180,60%,88%) 100%)" } },
  { label: "Wald", bg: { type: "gradient", value: "linear-gradient(135deg, hsl(120,40%,90%) 0%, hsl(150,50%,85%) 50%, hsl(80,45%,88%) 100%)" } },
  { label: "Lavendel", bg: { type: "gradient", value: "linear-gradient(135deg, hsl(270,50%,92%) 0%, hsl(290,45%,88%) 50%, hsl(250,50%,90%) 100%)" } },
  { label: "Rosé", bg: { type: "gradient", value: "linear-gradient(135deg, hsl(350,60%,92%) 0%, hsl(330,50%,88%) 50%, hsl(10,60%,90%) 100%)" } },
  { label: "Midnight", bg: { type: "gradient", value: "linear-gradient(135deg, hsl(230,30%,18%) 0%, hsl(250,25%,15%) 50%, hsl(210,35%,20%) 100%)" } },
  { label: "Sand", bg: { type: "color", value: "hsl(35,30%,92%)" } },
  { label: "Dunkel", bg: { type: "color", value: "hsl(220,15%,12%)" } },
];

const STORAGE_KEY = "hearo-chat-bg-global";
const PER_CHAT_KEY = "hearo-chat-bg-";

export const ChatBackgroundProvider = ({ children }: { children: ReactNode }) => {
  const [globalBackground, setGlobalBgState] = useState<ChatBackground>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : defaultBg;
    } catch { return defaultBg; }
  });

  const [perChat, setPerChat] = useState<Record<string, ChatBackground>>(() => {
    try {
      const all: Record<string, ChatBackground> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(PER_CHAT_KEY)) {
          const chatId = key.slice(PER_CHAT_KEY.length);
          all[chatId] = JSON.parse(localStorage.getItem(key) || "");
        }
      }
      return all;
    } catch { return {}; }
  });

  const setGlobalBackground = useCallback((bg: ChatBackground) => {
    setGlobalBgState(bg);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bg));
  }, []);

  const getChatBackground = useCallback((chatId: string): ChatBackground => {
    return perChat[chatId] || globalBackground;
  }, [perChat, globalBackground]);

  const setChatBackground = useCallback((chatId: string, bg: ChatBackground) => {
    setPerChat(prev => ({ ...prev, [chatId]: bg }));
    localStorage.setItem(PER_CHAT_KEY + chatId, JSON.stringify(bg));
  }, []);

  const clearChatBackground = useCallback((chatId: string) => {
    setPerChat(prev => {
      const next = { ...prev };
      delete next[chatId];
      return next;
    });
    localStorage.removeItem(PER_CHAT_KEY + chatId);
  }, []);

  return (
    <ChatBackgroundContext.Provider value={{ globalBackground, setGlobalBackground, getChatBackground, setChatBackground, clearChatBackground }}>
      {children}
    </ChatBackgroundContext.Provider>
  );
};
