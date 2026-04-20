import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Shield, Lock, Mic, EyeOff } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: "easeOut" as const },
  }),
};

const PrivacySection = forwardRef<HTMLElement>((_, ref) => {
  const { t } = useI18n();

  const items = [
    { icon: Shield, titleKey: "landing.privGdprTitle", descKey: "landing.privGdprDesc" },
    { icon: Lock, titleKey: "landing.privSecTitle", descKey: "landing.privSecDesc" },
    { icon: Mic, titleKey: "landing.privVoiceTitle", descKey: "landing.privVoiceDesc" },
    { icon: EyeOff, titleKey: "landing.privNoShareTitle", descKey: "landing.privNoShareDesc" },
  ];

  return (
    <section ref={ref} className="relative px-6 py-32 sm:py-44 overflow-hidden">
      {/* Soft top fade for seamless transition */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background to-transparent pointer-events-none" aria-hidden />

      <motion.div
        className="relative max-w-5xl mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      >
        {/* Eyebrow */}
        <motion.p
          variants={fadeUp}
          custom={0}
          className="text-xs font-semibold tracking-[0.18em] uppercase text-primary text-center mb-4"
        >
          {t("landing.privEyebrow")}
        </motion.p>

        {/* Headline */}
        <motion.h2
          variants={fadeUp}
          custom={1}
          className="text-3xl sm:text-4xl font-extrabold text-center text-foreground tracking-tight mb-4"
        >
          {t("landing.privTitle")}
        </motion.h2>

        {/* Sub */}
        <motion.p
          variants={fadeUp}
          custom={2}
          className="text-base text-muted-foreground text-center max-w-xl mx-auto mb-16 leading-relaxed"
        >
          {t("landing.privSub")}
        </motion.p>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <motion.div
                key={it.titleKey}
                variants={fadeUp}
                custom={i + 3}
                className="flex items-start gap-4 p-6 rounded-2xl bg-card/50 border border-border/50"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-base text-foreground mb-1.5 leading-snug">
                    {t(it.titleKey)}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(it.descKey)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Link to full policy */}
        <motion.div
          variants={fadeUp}
          custom={items.length + 3}
          className="mt-12 text-center"
        >
          <Link
            to="/privacy"
            className="text-sm text-muted-foreground/80 hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            {t("landing.privReadFull")}
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
});

PrivacySection.displayName = "PrivacySection";

export default PrivacySection;
