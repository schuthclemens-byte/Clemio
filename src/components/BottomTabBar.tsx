import { MessageCircle, Phone, Settings, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useMissedCallsCount } from "@/hooks/useMissedCallsCount";
import { useUnreadChatsCount } from "@/hooks/useUnreadChatsCount";

const tabs = [
  { label: "Chats", path: "/chats", icon: MessageCircle },
  { label: "Anrufe", path: "/call-history", icon: Phone },
  { label: "Profil", path: "/profile", icon: User },
  { label: "Einstellungen", path: "/settings", icon: Settings },
];

const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const missedCalls = useMissedCallsCount();
  const unreadChats = useUnreadChatsCount();

  const getBadge = (path: string) => {
    if (path === "/call-history") return missedCalls;
    if (path === "/chats") return unreadChats;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 glass border-t border-border/50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive =
            location.pathname === tab.path ||
            (tab.path === "/chats" && location.pathname.startsWith("/chat"));
          const badge = getBadge(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <tab.icon className="w-5 h-5" />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full gradient-primary text-primary-foreground text-[0.625rem] font-bold flex items-center justify-center">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span className="text-[0.625rem] font-medium leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabBar;
