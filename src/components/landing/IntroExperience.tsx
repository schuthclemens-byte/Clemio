import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { createPlayableAudio, prefetchLocalizedAudio } from "@/lib/landingAudio";

interface IntroExperienceProps {
  /** Called once the user has tapped and the intro should fade away. */
  onEnter: (audio: HTMLAudioElement | null) => void;
}

/**
 * Minimal first-touch experience: logo, audio orb, "tap to start".
 * No technical wording, no system feel — just an invitation.
 */
const IntroExperience = ({ onEnter }: IntroExperienceProps) => {
  const { t, locale } = useI18n();
  const [activated, setActivated] = useState(false);
  const triggeredRef = useRef(false);

  // Warm up localized TTS in the background so the first tap plays immediately.
  useEffect(() => {
    if (locale !== "de") void prefetchLocalizedAudio(locale);
  }, [locale]);

  const handleEnter = useCallback(async () => {
    if (triggeredRef.current) return;
    triggeredRef.current = true;
    if (navigator.vibrate) navigator.vibrate(15);

    setActivated(true);

    let audio: HTMLAudioElement | null = null;
    try {
      audio = createPlayableAudio(locale);
      await audio.play();
    } catch {
      // Autoplay blocked or audio failed — still proceed into the website.
      audio = null;
    }
    onEnter(audio);
  }, [locale, onEnter]);

  return (
    <motion.button
      type="button"
      onClick={handleEnter}
      onTouchStart={handleEnter}
      initial={{ opacity: 1 }}
      animate={{ opacity: activated ? 0 : 1, scale: activated ? 1.06 : 1 }}
      transition={{
        opacity: { duration: 1.6, ease: [0.22, 1, 0.36, 1] },
        scale: { duration: 2.0, ease: [0.22, 1, 0.36, 1] },
      }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center cursor-pointer border-none outline-none w-full h-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%, hsl(var(--primary) / 0.10) 0%, hsl(340 70% 55% / 0.06) 35%, hsl(var(--background)) 75%)",
      }}
      aria-label={t("intro.tapToStart")}
    >
      {/* Soft ambient glow behind the orb */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] sm:w-[80vw] h-[80vh] rounded-full opacity-50 blur-[160px]"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary) / 0.45) 0%, hsl(340 75% 55% / 0.25) 50%, transparent 80%)",
          }}
          animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.55, 0.4] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.15, ease: "easeOut" }}
        className="relative flex flex-col items-center gap-16 sm:gap-20 pointer-events-none"
      >
        <span className="text-5xl sm:text-6xl font-extralight tracking-tight text-foreground">
          Clemio
        </span>

        <motion.div
          className="relative flex items-center justify-center"
          animate={{ scale: [1, 1.045, 1] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Pulsing rings */}
          <motion.div
            className="absolute w-24 h-24 rounded-full gradient-primary opacity-25"
            animate={{ scale: [1, 1.7, 1], opacity: [0.25, 0, 0.25] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute w-24 h-24 rounded-full gradient-primary opacity-15"
            animate={{ scale: [1, 2.1, 1], opacity: [0.15, 0, 0.15] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
          />
          <div className="relative w-20 h-20 rounded-full gradient-primary flex items-center justify-center shadow-[0_25px_70px_-15px_hsl(var(--primary)/0.65)] z-10">
            <Volume2 className="w-8 h-8 text-primary-foreground" strokeWidth={1.5} />
          </div>
        </motion.div>

        <motion.p
          className="text-muted-foreground text-sm tracking-[0.18em] font-light uppercase"
          animate={{ opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        >
          {t("intro.tapToStart")}
        </motion.p>
      </motion.div>
    </motion.button>
  );
};

export default IntroExperience;
