import { useNavigate } from "react-router-dom";
import { Download, ArrowRight, LogIn, MessageCircle, Sparkles, Play, Pause, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
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
  const [apkUrl, setApkUrl] = useState<string | null>(null);

  useEffect(() => {
    const { data } = supabase.storage.from("downloads").getPublicUrl("voicara.apk");
    if (data?.publicUrl) {
      fetch(data.publicUrl, { method: "HEAD" }).then(r => {
        if (r.ok) setApkUrl(data.publicUrl);
      }).catch(() => {});
    }
  }, []);

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
        <motion.div
          className="absolute -bottom-32 left-1/3 w-[450px] h-[450px] rounded-full opacity-15 blur-[100px]"
          style={{ background: "radial-gradient(circle, hsl(280 60% 55%), hsl(240 50% 50%) 60%, transparent 70%)" }}
          animate={{ x: [0, 25, 0], y: [0, -15, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        />
      </div>

      <motion.div
        className="relative z-10 max-w-xl mx-auto"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
      >
        <motion.div variants={fadeUp} custom={0} className="relative w-20 h-20 mx-auto mb-8">
          <div className="absolute inset-0 rounded-[1.5rem] gradient-primary blur-xl opacity-40 animate-voice-pulse" />
          <div className="relative w-20 h-20 rounded-[1.5rem] shadow-elevated overflow-hidden gradient-primary flex items-center justify-center">
            <MessageCircle className="w-10 h-10 text-primary-foreground" />
          </div>
        </motion.div>

        <motion.div variants={fadeUp} custom={1} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6 border border-primary/20">
          <Sparkles className="w-3.5 h-3.5" />
          {t("landing.badge")}
        </motion.div>

        <motion.h1 variants={fadeUp} custom={2} className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-5 leading-[1.12]">
          {t("landing.heroTitle1")}{" "}
          <span className="relative inline-block">
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient-shift_3s_ease-in-out_infinite]">
              {t("landing.heroTitle2")}
            </span>
            <motion.span
              className="absolute -bottom-1 left-0 right-0 h-1 rounded-full gradient-primary"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
              style={{ transformOrigin: "left" }}
            />
          </span>
          <br />
          {t("landing.heroTitle3")}
        </motion.h1>

        <motion.p variants={fadeUp} custom={3} className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-md mx-auto mb-10">
          {t("landing.heroSubtitle")}
        </motion.p>

        <motion.div variants={fadeUp} custom={4} className="mb-10">
          <motion.button
            onClick={playDemo}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative inline-flex items-center gap-4 px-7 py-4 rounded-2xl bg-card border border-border shadow-elevated hover:shadow-soft transition-all duration-300 w-full max-w-sm mx-auto"
          >
            <span className={`relative w-14 h-14 rounded-xl gradient-primary flex items-center justify-center shrink-0 transition-all duration-300 ${isPlaying ? "animate-voice-pulse" : "group-hover:scale-105"}`}>
              {isPlaying ? (
                <Pause className="w-6 h-6 text-primary-foreground" />
              ) : (
                <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
              )}
            </span>
            <span className="text-left flex-1">
              <span className="block text-sm font-bold text-foreground">
                {isPlaying ? t("landing.demoPlaying") : t("landing.demoPlay")}
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                {isPlaying ? t("landing.demoStop") : t("landing.demoSubtitle")}
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

        <motion.div variants={fadeUp} custom={5} className="flex flex-col items-center gap-3">
          <Button
            onClick={() => navigate("/login")}
            size="lg"
            className="rounded-full px-10 gap-2.5 text-base gradient-primary border-0 shadow-soft h-14 font-bold hover:shadow-elevated transition-all"
          >
            <LogIn className="w-5 h-5" />
            {t("landing.signIn")}
          </Button>

          <button
            onClick={() => navigate("/install")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-card border border-border text-foreground text-sm font-semibold shadow-sm hover:shadow-elevated hover:border-primary/30 transition-all active:scale-95"
          >
            <Download className="w-4 h-4 text-primary" />
            {t("landing.download")}
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
