import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useI18n } from "@/contexts/I18nContext";

const OfflineBanner = () => {
  const isOnline = useOnlineStatus();
  const { t } = useI18n();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2.5 bg-destructive text-destructive-foreground text-sm font-medium animate-reveal-up">
      <WifiOff className="w-4 h-4" />
      {t("offline.noConnection")}
    </div>
  );
};

export default OfflineBanner;
