import { useNavigate } from "react-router-dom";
import { Play, Pause, ArrowRight, Volume2 } from "lucide-react";
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
  const [hasPlayed, setHasPlayed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(demoVoice);
      audioRef.current.volume = 0.18;
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = () => setIsPlaying(false);
    }
    return audioRef.current;
  }, []);

  // Auto-play on first tap/click anywhere
  useEffect(() => {
    if (hasPlayed) return;
    const handler = () => {
      setHasPlayed(true);
      const audio = ensureAudio();
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    };
    document.addEventListener("click", handler, { once: true });
    document.addEventListener("touchstart", handler, { once: true });
    return () => {
      document.removeEventListener("click", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [hasPlayed, ensureAudio]);

  const togglePlay = useCallback(() => {
    const audio = ensureAudio();
    if (isPlaying) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
      return;
    }
    audio.play();
    setIsPlaying(true);
    setHasPlayed(true);
  }, [isPlaying, ensureAudio]);

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

          {/* Auto-play hint */}
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
