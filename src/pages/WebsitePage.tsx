import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import HeroSectionV2 from "@/components/landing/HeroSectionV2";
import FeaturesSectionV2 from "@/components/landing/FeaturesSectionV2";
import EmotionSection from "@/components/landing/EmotionSection";
import PrivacySection from "@/components/landing/PrivacySection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import FooterSection from "@/components/landing/FooterSection";
import LanguageSwitcher from "@/components/landing/LanguageSwitcher";
import IntroExperience from "@/components/landing/IntroExperience";

const INTRO_KEY = "clemio_intro_done";

const WebsitePage = () => {
  const { user, loading } = useAuth();
  const { syncLocaleForPath } = useI18n();
  const [introDone, setIntroDone] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(INTRO_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [introAudio, setIntroAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    syncLocaleForPath(window.location.pathname);
  }, [syncLocaleForPath]);

  useEffect(() => {
    if (introDone) {
      try {
        sessionStorage.setItem(INTRO_KEY, "1");
      } catch {
        /* ignore quota errors */
      }
    }
  }, [introDone]);

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
      {/* Website is always mounted so the intro can dissolve INTO it,
          giving a single continuous experience instead of a screen swap. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: introDone ? 1 : 0 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        aria-hidden={!introDone}
        style={{ pointerEvents: introDone ? "auto" : "none" }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: introDone ? 1 : 0 }}
          transition={{ duration: 0.8, delay: introDone ? 0.6 : 0 }}
          className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[60]"
        >
          <LanguageSwitcher />
        </motion.div>

        <HeroSectionV2 initialAudio={introAudio} />
        <FeaturesSectionV2 />
        <EmotionSection />
        <PrivacySection />
        <FinalCTASection />
        <FooterSection />
      </motion.div>

      <AnimatePresence>
        {!introDone && (
          <IntroExperience
            key="intro"
            onEnter={(audio) => {
              setIntroAudio(audio);
              setIntroDone(true);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default WebsitePage;
