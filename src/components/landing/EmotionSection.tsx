import { motion } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";

const EmotionSection = () => {
  const { t } = useI18n();

  // 28 Bars für die "gesprochene" Wellenform
  const bars = Array.from({ length: 28 }, (_, i) => {
    const seed = Math.sin(i * 1.7) * 0.5 + 0.5;
    const min = 0.22 + seed * 0.28;
    const max = 0.6 + seed * 0.4;
    return { min, max, delay: i * 0.05 };
  });

  return (
    <section className="relative px-6 py-32 sm:py-44 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[60vh] rounded-full opacity-25 blur-[120px]"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative max-w-5xl mx-auto">
        {/* Eyebrow + Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="text-center mb-16 sm:mb-20"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70 mb-4">
            {t("landing.emotionEyebrow")}
          </p>
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extralight tracking-[-0.02em] leading-[1.05] text-foreground text-balance max-w-3xl mx-auto">
            {t("landing.emotionTitle")}
          </h2>
        </motion.div>

        {/* Vergleich: Geschrieben vs. Gesprochen */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* Geschrieben */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative rounded-3xl p-8 sm:p-10 bg-card/30 backdrop-blur-xl border border-border/40 overflow-hidden flex flex-col items-center text-center min-h-[260px] justify-between"
          >
            <p className="text-[0.7rem] uppercase tracking-[0.28em] text-muted-foreground/60 font-light">
              {t("landing.emotionTextLabel")}
            </p>
            <p className="text-2xl sm:text-3xl font-light text-muted-foreground/80 tracking-tight my-8">
              {t("landing.emotionExample")}
            </p>
            {/* Leerer Raum statt Tonalität — visualisiert das Fehlen */}
            <p className="text-xs text-muted-foreground/40 font-light italic">—</p>
          </motion.div>

          {/* Gesprochen */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
            className="relative rounded-3xl p-8 sm:p-10 bg-card/50 backdrop-blur-xl border border-border/60 overflow-hidden flex flex-col items-center text-center min-h-[260px] justify-between"
          >
            {/* Sanfter Glow */}
            <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-gradient-to-br from-primary/25 to-transparent opacity-70 blur-3xl pointer-events-none" />

            <p className="relative text-[0.7rem] uppercase tracking-[0.28em] text-primary/80 font-light">
              {t("landing.emotionVoiceLabel")}
            </p>

            {/* Wellenform */}
            <div className="relative my-6 flex items-center justify-center gap-[3px] sm:gap-[4px] h-16 sm:h-20 w-full max-w-[20rem]">
              {bars.map((b, i) => (
                <motion.span
                  key={i}
                  className="w-[3px] sm:w-[4px] rounded-full bg-gradient-to-t from-primary via-foreground to-primary"
                  style={{ height: `${b.min * 100}%` }}
                  animate={{ height: [`${b.min * 100}%`, `${b.max * 100}%`, `${b.min * 100}%`] }}
                  transition={{
                    duration: 1.4 + (i % 5) * 0.15,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: b.delay,
                  }}
                />
              ))}
            </div>

            {/* Tonalitäten */}
            <div className="relative flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
              {[
                t("landing.emotionTone1"),
                t("landing.emotionTone2"),
                t("landing.emotionTone3"),
              ].map((tone, i) => (
                <motion.span
                  key={tone}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 + i * 0.12 }}
                  className="px-3 py-1 rounded-full bg-foreground/[0.06] border border-border/50 text-xs text-foreground/75 font-light tracking-wide"
                >
                  {tone}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Schluss-Satz */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
          className="mt-16 sm:mt-20 text-center text-lg sm:text-xl text-foreground/80 font-light max-w-2xl mx-auto leading-relaxed tracking-tight"
        >
          {t("landing.emotionSub")}
        </motion.p>
      </div>
    </section>
  );
};

export default EmotionSection;
