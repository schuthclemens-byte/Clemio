import HeroSection from "@/components/landing/HeroSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import TrustSection from "@/components/landing/TrustSection";
import CTASection from "@/components/landing/CTASection";
import FooterSection from "@/components/landing/FooterSection";
import LanguageSwitcher from "@/components/landing/LanguageSwitcher";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden relative">
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[9999]">
        <LanguageSwitcher />
      </div>
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <TrustSection />
      <CTASection />
      <FooterSection />
    </div>
  );
};

export default LandingPage;
