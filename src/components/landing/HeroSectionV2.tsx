import { useNavigate } from "react-router-dom";
import { Play, Pause, Volume2, VolumeX, ArrowRight } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";

const LANDING_AUDIO_SRC = "/landing-voice-original.mp3";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const preloadedAudio = new Audio(`${LANDING_AUDIO_SRC}?v=1`);
preloadedAudio.preload = "auto";
preloadedAudio.volume = 0.18;
preloadedAudio.load();

const ttsCache = new Map<string, HTMLAudioElement>();
const ttsPending = new Map<string, Promise<HTMLAudioElement | null>>();

function detectLang(): string {
  const saved = localStorage.getItem("app-locale");
  if (saved && ["de", "en", "es", "fr", "tr", "ar"].includes(saved)) return saved;
  const prefix = (navigator.language || "").split("-")[0].toLowerCase();
  return ["de", "en", "es", "fr", "tr", "ar"].includes(prefix) ? prefix : "de";
}

function prefetchTTS(lang: string): Promise<HTMLAudioElement | null> {
  if (ttsCache.has(lang)) return Promise.resolve(ttsCache.get(lang)!);
  if (ttsPending.has(lang)) return ttsPending.get(lang)!;

  const dayKey = new Date().toISOString().slice(0, 10);
  const promise = fetch(`${SUPABASE_URL}/functions/v1/onboarding-tts?lang=${lang}&v=${dayKey}`)
    .then(async (res) => {
      const ct = res.headers.get("Content-Type") || "";
      if (ct.includes("application/json") || !res.ok) return null;
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audio.preload = "auto";
      audio.volume = 0.18;
      ttsCache.set(lang, audio);
      return audio;
    })
    .catch(() => null)
    .finally(() => ttsPending.delete(lang));

  ttsPending.set(lang, promise);
  return promise;
}

const _ttsSessionKey = "clemio_landing_tts_prefetched";
const initialLang = detectLang();
if (initialLang !== "de" && !sessionStorage.getItem(_ttsSessionKey)) {
  sessionStorage.setItem(_ttsSessionKey, "1");
  prefetchTTS(initialLang);
}

const HeroSectionV2 = () => {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [isPlaying, setIsPlaying] = useState(false);
  const [activated, setActivated] = useState(false);
  const [playError, setPlayError] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const triggeredRef = useRef(false);
  const retryCountRef = useRef(0);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (locale !== "de") prefetchTTS(locale);
  }, [locale]);

  const fetchOnboardingAudio = useCallback((): HTMLAudioElement => {
    const cached = ttsCache.get(locale);
    const source = cached ?? preloadedAudio;
    const audio = source.cloneNode(true) as HTMLAudioElement;
    audio.volume = 0.18;
    return audio;
  }, [locale]);

  const playAudio = useCallback(async (audio: HTMLAudioElement) => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => setIsPlaying(false);
    setIsPlaying(true);
    await audio.play();
  }, []);

  const startDemo = useCallback(async () => {
    if (triggeredRef.current) return;
    triggeredRef.current = true;
    if (navigator.vibrate) navigator.vibrate(15);
    try {
      const audio = fetchOnboardingAudio();
      setActivated(true);
      setPlayError(false);
      await playAudio(audio);
    } catch {
      retryCountRef.current += 1;
      triggeredRef.current = false;
      if (retryCountRef.current >= 3) {
        setPlayError(true);
        setActivated(true);
      }
    }
  }, [fetchOnboardingAudio, playAudio]);

  useEffect(() => {
    if (activated) return;
    const handleTrigger = () => void startDemo();
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
    try {
      const audio = fetchOnboardingAudio();
      audio.currentTime = 0;
      setActivated(true);
      await playAudio(audio);
    } catch {
      triggeredRef.current = false;
    }
  }, [isPlaying, fetchOnboardingAudio, playAudio]);

  return (
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      {/* Tap-to-start overlay */}
      <AnimatePresence>
        {!activated && (
          <motion.button
            key="tap-overlay"
            type="button"
            onClick={() => void startDemo()}
            onTouchStart={() => void startDemo()}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeOut" } }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background cursor-pointer border-none outline-none w-full h-full"
            aria-label={t("landing.tapToStart")}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col items-center gap-6 pointer-events-none"
            >
              <span className="text-5xl sm:text-6xl font-extralight tracking-tight text-foreground">Clemio</span>
              <div className="relative flex items-center justify-center">
                <motion.div
                  className="absolute w-24 h-24 rounded-full gradient-primary opacity-25"
                  animate={{ scale: [1, 1.6, 1], opacity: [0.25, 0, 0.25] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute w-24 h-24 rounded-full gradient-primary opacity-15"
                  animate={{ scale: [1, 2, 1], opacity: [0.15, 0, 0.15] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                />
                <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center shadow-soft z-10">
                  <Volume2 className="w-8 h-8 text-primary-foreground" />
                </div>
              </div>
              <motion.p
                className="text-muted-foreground text-sm tracking-wide"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              >
                {t("landing.tapToStart")}
              </motion.p>
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Ambient sunset glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[140vw] sm:w-[80vw] h-[80vh] rounded-full opacity-40 blur-[120px]"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, hsl(18 90% 55% / 0.5) 35%, transparent 70%)" }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.55, 0.4] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-10%] right-[-20%] w-[80vw] h-[60vh] rounded-full opacity-25 blur-[120px]"
          style={{ background: "radial-gradient(circle, hsl(340 75% 55%), hsl(320 70% 50%) 50%, transparent 70%)" }}
          animate={{ x: [0, -30, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </div>

      {/* Floating audio orb */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
        className="relative z-10 mb-12 sm:mb-16"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          {/* outer halo */}
          <motion.div
            className="absolute inset-[-30%] rounded-full opacity-70 blur-3xl"
            style={{ background: "conic-gradient(from 0deg, hsl(var(--primary)), hsl(340 75% 55%), hsl(45 95% 65%), hsl(var(--primary)))" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          />
          <button
            onClick={() => void togglePlay()}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="relative size-44 sm:size-56 rounded-full backdrop-blur-3xl bg-card/40 border border-border/40 shadow-elevated flex items-center justify-center group transition-all duration-500 hover:scale-[1.03] active:scale-[0.98] overflow-hidden"
          >
            {/* inner shimmer */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-foreground/10 via-transparent to-transparent pointer-events-none" />
            {/* play / pause */}
            <span className={`relative z-10 flex items-center justify-center transition-transform duration-500 ${isPlaying ? "scale-100" : "group-hover:scale-110"}`}>
              {isPlaying ? (
                <Pause className="w-12 h-12 sm:w-14 sm:h-14 text-foreground drop-shadow-[0_0_20px_hsl(var(--primary)/0.6)]" />
              ) : (
                <Play className="w-12 h-12 sm:w-14 sm:h-14 text-foreground ml-1 drop-shadow-[0_0_20px_hsl(var(--primary)/0.6)]" />
              )}
            </span>

            {/* waveform overlay when playing */}
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
                      transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </motion.div>
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: "easeOut", delay: 0.25 }}
        className="relative z-10 text-4xl sm:text-6xl lg:text-7xl font-extralight tracking-tight leading-[1.05] text-balance max-w-3xl mx-auto"
      >
        <span className="text-foreground/70 block">{t("landing.heroLine1")}</span>
        <span className="block bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60 font-light mt-1 sm:mt-2">
          {t("landing.heroLine2")}
        </span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: "easeOut", delay: 0.45 }}
        className="relative z-10 mt-6 sm:mt-8 text-base sm:text-xl text-muted-foreground font-light max-w-md mx-auto leading-relaxed"
      >
        {t("landing.heroSubV2")}
      </motion.p>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: "easeOut", delay: 0.6 }}
        className="relative z-10 mt-10 sm:mt-12"
      >
        <button
          onClick={() => navigate("/login")}
          className="group relative inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-foreground text-background font-medium text-base shadow-elevated transition-all duration-300 hover:scale-[1.04] active:scale-[0.97]"
        >
          <span className="relative z-10">{t("landing.ctaTryApp")}</span>
          <ArrowRight className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </motion.div>

      {/* Audio error toast */}
      <AnimatePresence>
        {playError && !isPlaying && activated && (
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
