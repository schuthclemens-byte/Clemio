import { useNavigate } from "react-router-dom";
import { Play, Pause, ArrowRight } from "lucide-react";
import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import demoVoice from "@/assets/demo-voice.mp3";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: "easeOut" as const },
  }),
};

const HeroSection = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playDemo = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(demoVoice);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }
    audioRef.current.play();
    setIsPlaying(true);
  }, [isPlaying]);

  return (
    <section className="relative min-h-[100vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-30 blur-[100px]"
          style={{ background: "radial-gradient(circle, hsl(45 95% 58%), hsl(18 90% 55%) 60%, transparent 70%)" }}
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
        variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
      >
        {/* Title */}
        <motion.h1 variants={fadeUp} custom={0} className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-3 leading-tight">
          {t("landing.startTitle")}
        </motion.h1>

        {/* Voice demo card */}
        <motion.div variants={fadeUp} custom={1} className="mb-6">
          <motion.button
            onClick={playDemo}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative inline-flex items-center gap-4 px-6 py-4 rounded-2xl bg-card border border-border shadow-elevated hover:shadow-soft transition-all duration-300 w-full"
          >
            <span className={`relative w-14 h-14 rounded-xl gradient-primary flex items-center justify-center shrink-0 transition-all duration-300 ${isPlaying ? "animate-voice-pulse" : "group-hover:scale-105"}`}>
              {isPlaying ? (
                <Pause className="w-6 h-6 text-primary-foreground" />
              ) : (
                <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
              )}
            </span>
            <span className="text-left flex-1">
              <span className="block text-sm font-semibold text-foreground leading-snug">
                {t("landing.startDemoText")}
              </span>
            </span>
            {isPlaying && (
              <span className="flex items-center gap-[3px] ml-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.span
                    key={i}
                    className="w-[3px] bg-primary rounded-full"
                    animate={{ height: [6, 18, 6] }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1, ease: "easeInOut" }}
                  />
                ))}
              </span>
            )}
          </motion.button>
        </motion.div>

        {/* Subtitle */}
        <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-8">
          {t("landing.startSubtitle")}
        </motion.p>

        {/* CTA */}
        <motion.div variants={fadeUp} custom={3}>
          <button
            onClick={() => navigate("/login")}
            className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-semibold text-base flex items-center justify-center gap-2 shadow-soft active:scale-[0.97] transition-transform"
          >
            {t("landing.startCTA")}
            <ArrowRight className="w-4.5 h-4.5" />
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
