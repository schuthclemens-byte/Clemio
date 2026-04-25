import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import BottomTabBar from "@/components/BottomTabBar";
import { supabase } from "@/integrations/supabase/client";
import { isValidAuthPhone } from "@/lib/authPhone";

const hasUsablePhone = (value?: string | null) => {
  if (!value || value.includes("@") || value.length > 40) return false;
  return isValidAuthPhone(value);
};

const ProtectedRoute = ({ children, requirePhone = true }: { children: React.ReactNode; requirePhone?: boolean }) => {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  const [phoneCheckLoading, setPhoneCheckLoading] = useState(true);
  const [needsPhone, setNeedsPhone] = useState(false);

  useEffect(() => {
    if (!user || !requirePhone) {
      setPhoneCheckLoading(false);
      setNeedsPhone(false);
      return;
    }

    const skippedThisSession = sessionStorage.getItem(`clemio_phone_prompt_skipped_${user.id}`) === "true";
    if (skippedThisSession) {
      setPhoneCheckLoading(false);
      setNeedsPhone(false);
      return;
    }

    setPhoneCheckLoading(true);
    supabase
      .from("profiles")
      .select("phone_number")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setNeedsPhone(!hasUsablePhone(data?.phone_number));
        setPhoneCheckLoading(false);
      });
  }, [user, requirePhone, location.pathname]);

  if (loading || phoneCheckLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (requirePhone && needsPhone && location.pathname !== "/phone-onboarding") {
    return <Navigate to="/phone-onboarding" replace />;
  }

  // Hide bottom tab bar on individual chat / call pages
  const hideTabBar = /^\/(chat|call)\//.test(location.pathname);

  // Mobile: bottom tab bar
  if (isMobile) {
    return (
      <>
        <div className={hideTabBar ? "" : "pb-16"}>{children}</div>
        {!hideTabBar && <BottomTabBar />}
      </>
    );
  }

  // Desktop: sidebar layout
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ProtectedRoute;
