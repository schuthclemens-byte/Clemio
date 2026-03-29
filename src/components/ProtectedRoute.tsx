import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import BottomTabBar from "@/components/BottomTabBar";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

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
