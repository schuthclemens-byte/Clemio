import { useNavigate } from "react-router-dom";
import { Play, Pause, ArrowRight, Volume2, VolumeX } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import demoVoice from "@/assets/demo-voice.mp3";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.7, ease: "easeOut" as const },
  }),
};

const HeroSection = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [isPlaying, setIsPlaying] = useState(false);
  const [activated, setActivated] = useState(false);
  const [playError, setPlayError] = useState(false);
  const [audio] = useState(() => {
    const nextAudio = new Audio(demoVoice);
    nextAudio.preload = "auto";
    nextAudio.volume = 0.18;
    return nextAudio;
  });
  const audioRef = useRef<HTMLAudioElement>(audio);
  const triggeredRef = useRef(false);
  const retryCountRef = useRef(0);

  useEffect(() => {
    const currentAudio = audioRef.current;

    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
      setIsPlaying(false);
      triggeredRef.current = false;
    };

    currentAudio.load();
    currentAudio.addEventListener("ended", handleEnded);
    currentAudio.addEventListener("error", handleError);

    return () => {
      currentAudio.pause();
      currentAudio.removeEventListener("ended", handleEnded);
      currentAudio.removeEventListener("error", handleError);
      currentAudio.src = "";
    };
  }, []);

  const startDemo = useCallback(async () => {
    const currentAudio = audioRef.current;
    if (!currentAudio || triggeredRef.current) return;

    triggeredRef.current = true;

    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(15);
    }

    try {
      currentAudio.currentTime = 0;
      await currentAudio.play();
      setIsPlaying(true);
      setActivated(true);
      setPlayError(false);
    } catch {
      retryCountRef.current += 1;
      triggeredRef.current = false;

      // After 3 failed attempts, show fallback error
      if (retryCountRef.current >= 3) {
        setPlayError(true);
        setActivated(true);
      }
    }
  }, []);

  useEffect(() => {
    if (activated) return;

    const handleTrigger = () => {
      void startDemo();
    };

    document.addEventListener("touchstart", handleTrigger, { passive: true, capture: true });
    document.addEventListener("click", handleTrigger, true);
    document.addEventListener("scroll", handleTrigger, { passive: true, capture: true });
    document.addEventListener("keydown", handleTrigger, true);

    return () => {
      document.removeEventListener("touchstart", handleTrigger, true);
      document.removeEventListener("click", handleTrigger, true);
      document.removeEventListener("scroll", handleTrigger, true);
      document.removeEventListener("keydown", handleTrigger, true);
    };
  }, [activated, startDemo]);

  const togglePlay = useCallback(() => {
    const currentAudio = audioRef.current;
    if (!currentAudio) return;

    if (isPlaying) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    triggeredRef.current = true;
    void currentAudio.play()
      .then(() => {
        setIsPlaying(true);
        setActivated(true);
      })
      .catch(() => {
        triggeredRef.current = false;
      });
  }, [isPlaying]);

  return (
    <section className="relative min-h-[100vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      {/* Tap-to-start overlay – invisible trigger area */}
      <AnimatePresence>
        {!activated && (
          <motion.div
            key="tap-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4, ease: "easeOut" } }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col items-center gap-5"
            >
              <span className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
                Clemio
              </span>

              {/* Pulsing sound ring */}
              <div className="relative flex items-center justify-center">
                <motion.div
                  className="absolute w-20 h-20 rounded-full gradient-primary opacity-20"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute w-20 h-20 rounded-full gradient-primary opacity-15"
                  animate={{ scale: [1, 1.8, 1], opacity: [0.15, 0, 0.15] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                />
                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center shadow-soft z-10">
                  <Volume2 className="w-7 h-7 text-primary-foreground" />
                </div>
              </div>

              <motion.p
                className="text-muted-foreground text-sm"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              >
                {t("landing.tapToStart") || "Tippe irgendwo, um zu starten"}
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-30 blur-[100px]"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)), hsl(18 90% 55%) 60%, transparent 70%)" }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full opacity-20 blur-[100px]"
          style={{ background: "radial-gradient(circle, hsl(340 75% 55%), hsl(320 70% 50%) 60%, transparent 70%)" }}
          animate={{ x: [0, -20, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </div>

      <motion.div
        className="relative z-10 max-w-md mx-auto"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
      >
        {/* Brand */}
        <motion.div variants={fadeUp} custom={0} className="mb-2">
          <span className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
            Clemio
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1 variants={fadeUp} custom={1} className="text-lg sm:text-xl font-semibold text-foreground/80 mb-6 leading-snug">
          {t("landing.heroListenTitle")}
        </motion.h1>

        {/* Voice demo card */}
        <motion.div variants={fadeUp} custom={2} className="mb-5">
          <motion.button
            onClick={togglePlay}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative inline-flex items-center gap-4 px-5 py-4 rounded-2xl bg-card border border-border shadow-elevated hover:shadow-soft transition-all duration-300 w-full"
          >
            <span className={`relative w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0 transition-all duration-300 ${isPlaying ? "animate-voice-pulse" : "group-hover:scale-105"}`}>
              {isPlaying ? (
                <Pause className="w-5 h-5 text-primary-foreground" />
              ) : (
                <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
              )}
            </span>
            <span className="text-left flex-1 min-w-0">
              <span className="block text-sm font-medium text-foreground leading-snug">
                {t("landing.heroDemoText")}
              </span>
            </span>
            <AnimatePresence>
              {isPlaying && (
                <motion.span
                  className="flex items-center gap-[3px] ml-1"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.span
                      key={i}
                      className="w-[3px] bg-primary rounded-full"
                      animate={{ height: [6, 18, 6] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1, ease: "easeInOut" }}
                    />
                  ))}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Playing hint */}
          <AnimatePresence>
            {isPlaying && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-2"
              >
                <Volume2 className="w-3.5 h-3.5" />
                {t("landing.heroAutoPlay")}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Subtitle */}
        <motion.p variants={fadeUp} custom={3} className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-8">
          {t("landing.heroSubtitleNew")}
        </motion.p>

        {/* CTA */}
        <motion.div variants={fadeUp} custom={4}>
          <button
            onClick={() => navigate("/login")}
            className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 shadow-soft active:scale-[0.97] transition-transform"
          >
            {t("landing.heroCTA")}
            <ArrowRight className="w-4.5 h-4.5" />
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
