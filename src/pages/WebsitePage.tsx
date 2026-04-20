import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import HeroSectionV2 from "@/components/landing/HeroSectionV2";
import FeaturesSectionV2 from "@/components/landing/FeaturesSectionV2";
import EmotionSection from "@/components/landing/EmotionSection";
import PrivacySection from "@/components/landing/PrivacySection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import FooterSection from "@/components/landing/FooterSection";
import LanguageSwitcher from "@/components/landing/LanguageSwitcher";

const WebsitePage = () => {
  const { user, loading } = useAuth();
  const { syncLocaleForPath } = useI18n();

  useEffect(() => {
    syncLocaleForPath(window.location.pathname);
  }, [syncLocaleForPath]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (user) return <Navigate to="/chats" replace />;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden relative">
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[60]">
        <LanguageSwitcher />
      </div>

      <HeroSectionV2 />
      <FeaturesSectionV2 />
      <EmotionSection />
      <PrivacySection />
      <FinalCTASection />
      <FooterSection />
    </div>
  );
};

export default WebsitePage;
