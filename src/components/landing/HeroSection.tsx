import { useNavigate } from "react-router-dom";
import { Play, Pause, ArrowRight, Volume2, VolumeX } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";

const LANDING_AUDIO_SRC = "/landing-voice-original.mp3";

// Preload audio globally so it's ready instantly
const preloadedAudio = new Audio(`${LANDING_AUDIO_SRC}?v=1`);
preloadedAudio.preload = "auto";
preloadedAudio.volume = 0.18;
preloadedAudio.load();

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
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const triggeredRef = useRef(false);
  const retryCountRef = useRef(0);
  

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  /** Fetch TTS audio from edge function in the user's language */
  const fetchOnboardingAudio = useCallback(async (): Promise<HTMLAudioElement> => {
    // Clone from preloaded audio for instant playback
    const audio = preloadedAudio.cloneNode(true) as HTMLAudioElement;
    audio.volume = 0.18;
    return audio;
  }, []);

  /** Play the onboarding audio */
  const playAudio = useCallback(async (audio: HTMLAudioElement) => {
    audioRef.current?.pause();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }

    audioRef.current = audio;

    audio.onended = () => {
      setIsPlaying(false);
    };
    audio.onerror = () => {
      setIsPlaying(false);
    };

    setIsPlaying(true);
    await audio.play();
  }, []);

  const startDemo = useCallback(async () => {
    if (triggeredRef.current) return;
    triggeredRef.current = true;

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(15);

    setIsLoadingAudio(true);

    try {
      const audio = await fetchOnboardingAudio();
      setIsLoadingAudio(false);
      setActivated(true);
      setPlayError(false);
      await playAudio(audio);
    } catch {
      retryCountRef.current += 1;
      triggeredRef.current = false;
      setIsLoadingAudio(false);

      if (retryCountRef.current >= 3) {
        setPlayError(true);
        setActivated(true);
      }
    }
  }, [fetchOnboardingAudio, playAudio]);

  // Auto-trigger on first interaction
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

  const togglePlay = useCallback(async () => {
    const currentAudio = audioRef.current;

    if (isPlaying && currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    setIsLoadingAudio(true);
    try {
      const audio = await fetchOnboardingAudio();
      audio.currentTime = 0;
      setIsLoadingAudio(false);
      setActivated(true);
      await playAudio(audio);
    } catch {
      setIsLoadingAudio(false);
      triggeredRef.current = false;
    }
  }, [isPlaying, fetchOnboardingAudio, playAudio]);

  return (
    <section className="relative min-h-[100vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      {/* Fullscreen tap layer */}
      <AnimatePresence>
        {!activated && (
          <motion.button
            key="tap-overlay"
            type="button"
            onClick={() => void startDemo()}
            onTouchStart={() => void startDemo()}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4, ease: "easeOut" } }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background cursor-pointer border-none outline-none w-full h-full"
            aria-label="Tippe um Audio zu starten"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col items-center gap-5 pointer-events-none"
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
                  {isLoadingAudio ? (
                    <div className="w-6 h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <Volume2 className="w-7 h-7 text-primary-foreground" />
                  )}
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
          </motion.button>
        )}
      </AnimatePresence>

      {/* Play error fallback hint */}
      <AnimatePresence>
        {playError && !isPlaying && activated && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border shadow-elevated text-sm text-muted-foreground"
          >
            <VolumeX className="w-4 h-4 text-destructive shrink-0" />
            <span>Audio konnte nicht gestartet werden – nutze den Play-Button</span>
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
            onClick={() => void togglePlay()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative inline-flex items-center gap-4 px-5 py-4 rounded-2xl bg-card border border-border shadow-elevated hover:shadow-soft transition-all duration-300 w-full"
          >
            <span className={`relative w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0 transition-all duration-300 ${isPlaying ? "animate-voice-pulse" : "group-hover:scale-105"}`}>
              {isLoadingAudio ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : isPlaying ? (
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
