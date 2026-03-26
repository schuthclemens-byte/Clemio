import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import HeroSection from "@/components/landing/HeroSection";
import PromoSection from "@/components/landing/PromoSection";
import PositioningSection from "@/components/landing/PositioningSection";
import TrustSection from "@/components/landing/TrustSection";
import VoiceRulesSection from "@/components/landing/VoiceRulesSection";
import PremiumSection from "@/components/landing/PremiumSection";
import FooterSection from "@/components/landing/FooterSection";
import LanguageSwitcher from "@/components/landing/LanguageSwitcher";

const LandingPage = () => {
  const { user, loading } = useAuth();

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
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[9999]">
        <LanguageSwitcher />
      </div>
      <HeroSection />
      <PromoSection />
      <PositioningSection />
      <TrustSection />
      <VoiceRulesSection />
      <PremiumSection />
      <FooterSection />
    </div>
  );
};

export default LandingPage;
