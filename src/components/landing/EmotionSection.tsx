import { motion } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";

const EmotionSection = () => {
  const { t } = useI18n();

  // 40 bars, generated with deterministic-looking heights
  const bars = Array.from({ length: 40 }, (_, i) => {
    const seed = Math.sin(i * 1.7) * 0.5 + 0.5;
    const min = 0.18 + seed * 0.25;
    const max = 0.55 + seed * 0.45;
    return { min, max, delay: i * 0.04 };
  });

  return (
    <section className="relative px-6 py-32 sm:py-40 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[60vh] rounded-full opacity-25 blur-[120px]"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative max-w-3xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="text-3xl sm:text-5xl lg:text-6xl font-extralight tracking-tight leading-[1.1] text-foreground text-balance"
        >
          {t("landing.emotionTitle")}
        </motion.h2>

        {/* Audio wave */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 1, delay: 0.3 }}
          className="mt-16 sm:mt-20 flex items-center justify-center gap-[3px] sm:gap-[5px] h-24 sm:h-32"
        >
          {bars.map((b, i) => (
            <motion.span
              key={i}
              className="w-[3px] sm:w-[4px] rounded-full bg-gradient-to-t from-primary via-foreground to-primary"
              style={{ height: `${b.min * 100}%` }}
              animate={{ height: [`${b.min * 100}%`, `${b.max * 100}%`, `${b.min * 100}%`] }}
              transition={{ duration: 1.4 + (i % 5) * 0.15, repeat: Infinity, ease: "easeInOut", delay: b.delay }}
            />
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.9, delay: 0.4, ease: "easeOut" }}
          className="mt-10 text-base sm:text-lg text-muted-foreground font-light max-w-md mx-auto leading-relaxed"
        >
          {t("landing.emotionSub")}
        </motion.p>
      </div>
    </section>
  );
};

export default EmotionSection;
