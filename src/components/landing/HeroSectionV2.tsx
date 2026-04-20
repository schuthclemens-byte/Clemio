import { useNavigate } from "react-router-dom";
import { Play, Pause, VolumeX, ArrowRight } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import { createPlayableAudio, prefetchLocalizedAudio } from "@/lib/landingAudio";

const HeroSectionV2 = () => {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playError, setPlayError] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Warm up localized TTS on language change.
  useEffect(() => {
    if (locale !== "de") void prefetchLocalizedAudio(locale);
  }, [locale]);

  // Cleanup
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const togglePlay = useCallback(async () => {
    const current = audioRef.current;

    if (isPlaying && current) {
      current.pause();
      current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    try {
      const audio = createPlayableAudio(locale);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      audioRef.current?.pause();
      audioRef.current = audio;
      setPlayError(false);
      setIsPlaying(true);
      await audio.play();
    } catch {
      setIsPlaying(false);
      setPlayError(true);
    }
  }, [isPlaying, locale]);

  return (
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-6 sm:px-10 py-10 sm:py-16 text-center overflow-hidden">
      {/* Premium ambient gradient — soft, calm, cinematic */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[160vw] sm:w-[100vw] h-[90vh] rounded-full opacity-30 blur-[140px]"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary) / 0.6) 0%, hsl(18 90% 55% / 0.35) 35%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.05, 1], opacity: [0.28, 0.38, 0.28] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-30%] left-1/2 -translate-x-1/2 w-[120vw] h-[70vh] rounded-full opacity-20 blur-[140px]"
          style={{
            background:
              "radial-gradient(circle, hsl(340 75% 55% / 0.4), hsl(280 70% 50% / 0.3) 50%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.18, 0.28, 0.18] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background pointer-events-none" />
      </div>

      {/* Floating audio orb — der visuelle Mittelpunkt */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: "easeOut", delay: 0.1 }}
        className="relative z-10 mb-24 sm:mb-32 flex justify-center w-full"
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          <motion.div
            className="absolute inset-[-25%] rounded-full opacity-50 blur-3xl"
            style={{
              background:
                "conic-gradient(from 0deg, hsl(var(--primary) / 0.8), hsl(340 75% 55% / 0.6), hsl(45 95% 65% / 0.7), hsl(var(--primary) / 0.8))",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          />
          <div
            className="absolute inset-[-8%] rounded-full opacity-60 blur-xl"
            style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.25), transparent 70%)" }}
          />
          <button
            onClick={() => void togglePlay()}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="relative size-44 sm:size-56 rounded-full backdrop-blur-3xl bg-card/30 border border-border/30 shadow-[0_25px_85px_-20px_hsl(var(--primary)/0.55)] flex items-center justify-center group transition-all duration-500 hover:scale-[1.03] active:scale-[0.98] overflow-hidden"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-foreground/15 via-transparent to-foreground/5 pointer-events-none" />
            <div className="absolute inset-3 rounded-full border border-foreground/10 pointer-events-none" />
            <span
              className={`relative z-10 flex items-center justify-center transition-transform duration-500 ${
                isPlaying ? "scale-100" : "group-hover:scale-110"
              }`}
            >
              {isPlaying ? (
                <Pause
                  className="w-14 h-14 sm:w-16 sm:h-16 text-foreground drop-shadow-[0_0_24px_hsl(var(--primary)/0.7)]"
                  strokeWidth={1.25}
                />
              ) : (
                <Play
                  className="w-14 h-14 sm:w-16 sm:h-16 text-foreground ml-1 drop-shadow-[0_0_24px_hsl(var(--primary)/0.7)]"
                  strokeWidth={1.25}
                  fill="currentColor"
                />
              )}
            </span>

            <AnimatePresence>
              {isPlaying && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-7 sm:bottom-9 left-1/2 -translate-x-1/2 flex items-end gap-1 h-6"
                >
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <motion.span
                      key={i}
                      className="w-[3px] bg-foreground/80 rounded-full"
                      animate={{ height: [4, 18, 4] }}
                      transition={{
                        duration: 0.7,
                        repeat: Infinity,
                        delay: i * 0.08,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.6, ease: "easeOut" }}
          className="absolute left-1/2 -translate-x-1/2 top-full mt-5 text-[0.7rem] sm:text-xs uppercase tracking-[0.22em] text-muted-foreground/60 font-light text-center whitespace-nowrap"
        >
          {isPlaying ? t("landing.heroOrbPlaying") : t("landing.heroOrbHint")}
        </motion.p>
      </motion.div>

      {/* Eyebrow */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: "easeOut", delay: 0.25 }}
        className="relative z-10 mb-6 sm:mb-8 text-[0.7rem] sm:text-xs uppercase tracking-[0.32em] text-muted-foreground/70 font-light"
      >
        {t("landing.heroEyebrow")}
      </motion.p>

      {/* Headline — zwei Zeilen, luftig */}
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        className="relative z-10 text-[2.2rem] sm:text-6xl lg:text-[5rem] font-extralight tracking-[-0.02em] leading-[1.15] sm:leading-[1.12] text-balance max-w-[20ch] mx-auto"
      >
        <span className="text-foreground/65 block">{t("landing.heroLine1")}</span>
        <span className="block bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/55 font-light mt-3 sm:mt-4">
          {t("landing.heroLine2")}
        </span>
      </motion.h1>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.7 }}
        className="relative z-10 mt-14 sm:mt-16 flex flex-col items-center gap-4"
      >
        <button
          onClick={() => navigate("/login")}
          className="group relative inline-flex items-center gap-3 px-10 py-5 rounded-full bg-foreground text-background font-medium text-base sm:text-lg tracking-tight shadow-[0_15px_50px_-12px_hsl(var(--foreground)/0.45)] transition-all duration-500 hover:shadow-[0_25px_70px_-10px_hsl(var(--primary)/0.55)] hover:scale-[1.04] active:scale-[0.97] overflow-hidden"
        >
          <span
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(340 75% 55%) 100%)" }}
          />
          <span className="relative z-10 group-hover:text-primary-foreground transition-colors duration-500">
            {t("landing.ctaTryApp")}
          </span>
          <ArrowRight
            className="w-5 h-5 relative z-10 transition-all duration-500 group-hover:translate-x-1 group-hover:text-primary-foreground"
            strokeWidth={2}
          />
        </button>
        <p className="text-xs text-muted-foreground/60 font-light tracking-wide">
          {t("landing.heroCtaHint")}
        </p>
      </motion.div>

      {/* Scroll hint — extrem dezent */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 1.4, ease: "easeOut" }}
        className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-10 pointer-events-none flex flex-col items-center gap-2"
        aria-hidden="true"
      >
        <div className="h-9 w-[1px] bg-gradient-to-b from-transparent to-foreground/30" />
        <motion.div
          animate={{ y: [0, 4, 0], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="w-[3px] h-[3px] rounded-full bg-foreground/60"
        />
      </motion.div>
      {/* Audio error toast */}
      <AnimatePresence>
        {playError && !isPlaying && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border shadow-elevated text-sm text-muted-foreground"
          >
            <VolumeX className="w-4 h-4 text-destructive shrink-0" />
            <span>{t("landing.heroAudioError")}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default HeroSectionV2;
