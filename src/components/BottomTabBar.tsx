import { MessageCircle, Phone, Palette, User, Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useMissedCallsCount } from "@/hooks/useMissedCallsCount";
import { useUnreadChatsCount } from "@/hooks/useUnreadChatsCount";
import { useI18n } from "@/contexts/I18nContext";

const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const missedCalls = useMissedCallsCount();
  const unreadChats = useUnreadChatsCount();
  const { locale, t } = useI18n();
  const tr = (de: string, en: string) => (locale === "de" ? de : en);

  const tabs = [
    { label: t("chat.chats"), path: "/chats", icon: MessageCircle },
    { label: tr("Anrufe", "Calls"), path: "/call-history", icon: Phone },
    { label: "Design", path: "/design-settings", icon: Palette },
    { label: tr("Profil", "Profile"), path: "/profile", icon: User },
    { label: t("settings.title"), path: "/settings", icon: Settings },
  ];

  const getBadge = (path: string) => {
    if (path === "/call-history") return missedCalls;
    if (path === "/chats") return unreadChats;
    return 0;
  };

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="floating-nav rounded-2xl mx-auto max-w-md">
        <div className="flex items-center justify-around h-16 px-1">
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
                  "flex flex-col items-center justify-center gap-1 h-12 px-3 rounded-xl transition-all duration-300 relative",
                  isActive
                    ? "gradient-primary text-primary-foreground shadow-soft scale-105"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative">
                  <tab.icon className={cn("w-5 h-5", isActive && "drop-shadow-sm")} />
                  {badge > 0 && (
                    <span className={cn(
                      "absolute -top-1.5 -right-2.5 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full text-[0.625rem] font-bold flex items-center justify-center",
                      isActive
                        ? "bg-primary-foreground text-primary"
                        : "gradient-primary text-primary-foreground"
                    )}>
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-[0.55rem] font-semibold leading-tight transition-all",
                  isActive ? "opacity-100" : "opacity-70"
                )}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomTabBar;