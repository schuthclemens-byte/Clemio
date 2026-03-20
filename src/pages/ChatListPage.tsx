import { useNavigate } from "react-router-dom";
import { Settings, Search } from "lucide-react";
import ChatListItem from "@/components/chat/ChatListItem";
import { useState } from "react";
import { useI18n } from "@/contexts/I18nContext";

const mockChats = [
  { id: "1", name: "Lena Müller", lastMessage: "Klingt super, bis dann! 👋", time: "14:32", unread: 2 },
  { id: "2", name: "Marco Rossi", lastMessage: "Hast du das Dokument bekommen?", time: "13:10", unread: 0 },
  { id: "3", name: "Sophie Chen", lastMessage: "Ich schick dir die Adresse", time: "Gestern", unread: 0 },
  { id: "4", name: "Ahmed Hassan", lastMessage: "Danke für die Hilfe!", time: "Gestern", unread: 0 },
  { id: "5", name: "Projekt-Gruppe", lastMessage: "Marco: Alles klar, machen wir", time: "Mo", unread: 5 },
];

const ChatListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { t } = useI18n();

  const filtered = mockChats.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold">{t("chat.chats")}</h1>
          <button
            onClick={() => navigate("/settings")}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors active:scale-95"
            aria-label={t("a11y.settings")}
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("chat.search")}
              className="w-full h-10 rounded-xl bg-secondary pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label={t("chat.search")}
            />
          </div>
        </div>
      </header>

      <div className="flex-1" role="list" aria-label={t("chat.chats")}>
        {filtered.length > 0 ? (
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
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatListPage;
