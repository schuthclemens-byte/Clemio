import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Server, Lock, KeyRound, Code2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
};

const TrustSection = forwardRef<HTMLElement>((_, ref) => {
  const { t } = useI18n();

  const facts = [
    {
      icon: Server,
      label: t("landing.trustFact1Label"),
      value: t("landing.trustFact1Value"),
      detail: t("landing.trustFact1Detail"),
    },
    {
      icon: Lock,
      label: t("landing.trustFact2Label"),
      value: t("landing.trustFact2Value"),
      detail: t("landing.trustFact2Detail"),
    },
    {
      icon: KeyRound,
      label: t("landing.trustFact3Label"),
      value: t("landing.trustFact3Value"),
      detail: t("landing.trustFact3Detail"),
    },
    {
      icon: Code2,
      label: t("landing.trustFact4Label"),
      value: t("landing.trustFact4Value"),
      detail: t("landing.trustFact4Detail"),
    },
  ];

  return (
    <section ref={ref} className="relative px-6 py-32 sm:py-44 overflow-hidden">
      {/* Subtle grid background for "technical" feel */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
        aria-hidden
      />

      <motion.div
        className="relative max-w-4xl mx-auto"
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
          {t("landing.trustEyebrow")}
        </motion.p>

        {/* Headline */}
        <motion.h2
          variants={fadeUp}
          custom={1}
          className="text-3xl sm:text-4xl font-extrabold text-center text-foreground tracking-tight mb-4"
        >
          {t("landing.trustTitle")}
        </motion.h2>

        {/* Sub */}
        <motion.p
          variants={fadeUp}
          custom={2}
          className="text-base text-muted-foreground text-center max-w-xl mx-auto mb-12 leading-relaxed"
        >
          {t("landing.trustSub")}
        </motion.p>

        {/* Facts grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {facts.map((fact, i) => {
            const Icon = fact.icon;
            return (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i + 3}
                className="group relative p-6 rounded-2xl bg-card/60 border border-border/60 backdrop-blur-sm hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.688rem] font-semibold tracking-wider uppercase text-muted-foreground mb-1">
                      {fact.label}
                    </p>
                    <p className="text-base font-bold text-foreground mb-1.5 leading-snug">
                      {fact.value}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {fact.detail}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Honest closing line */}
        <motion.p
          variants={fadeUp}
          custom={facts.length + 3}
          className="text-sm text-muted-foreground/80 text-center mt-10 max-w-md mx-auto leading-relaxed"
        >
          {t("landing.trustHonest")}
        </motion.p>
      </motion.div>
    </section>
  );
});

TrustSection.displayName = "TrustSection";

export default TrustSection;
