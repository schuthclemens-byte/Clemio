import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Mic, UserPlus, MessageCircleHeart, ArrowRight } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.55, ease: "easeOut" as const },
  }),
};

const HowItWorksSection = forwardRef<HTMLElement>((_, ref) => {
  const { t } = useI18n();

  const steps = [
    {
      icon: Mic,
      number: "01",
      title: t("landing.howStep1Title"),
      description: t("landing.howStep1Desc"),
      hint: t("landing.howStep1Hint"),
    },
    {
      icon: UserPlus,
      number: "02",
      title: t("landing.howStep2Title"),
      description: t("landing.howStep2Desc"),
      hint: t("landing.howStep2Hint"),
    },
    {
      icon: MessageCircleHeart,
      number: "03",
      title: t("landing.howStep3Title"),
      description: t("landing.howStep3Desc"),
      hint: t("landing.howStep3Hint"),
    },
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
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      >
        {/* Eyebrow */}
        <motion.p
          variants={fadeUp}
          custom={0}
          className="text-xs font-semibold tracking-[0.18em] uppercase text-primary text-center mb-4"
        >
          {t("landing.howEyebrow")}
        </motion.p>

        {/* Headline */}
        <motion.h2
          variants={fadeUp}
          custom={1}
          className="text-3xl sm:text-4xl font-extrabold text-center text-foreground tracking-tight mb-4"
        >
          {t("landing.howTitle")}
        </motion.h2>

        {/* Sub */}
        <motion.p
          variants={fadeUp}
          custom={2}
          className="text-base text-muted-foreground text-center max-w-xl mx-auto mb-16 leading-relaxed"
        >
          {t("landing.howSubtitle")}
        </motion.p>

        {/* Steps row (desktop) / stack (mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 relative">
          {/* Connector line on desktop */}
          <div
            className="hidden md:block absolute top-[3.25rem] left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-transparent via-border to-transparent pointer-events-none"
            aria-hidden
          />

          {steps.map((step, i) => {
            const Icon = step.icon;
            const isLast = i === steps.length - 1;
            return (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i + 3}
                className="relative flex flex-col items-center text-center px-2"
              >
                {/* Icon circle with number badge */}
                <div className="relative mb-5">
                  <div className="w-[6.5rem] h-[6.5rem] rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground shadow-elevated">
                    <Icon className="w-9 h-9" strokeWidth={1.75} />
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center shadow-md">
                    {step.number}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-bold text-lg text-foreground mb-2 leading-snug">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed mb-3 max-w-xs">
                  {step.description}
                </p>

                {/* Hint chip */}
                <span className="inline-flex items-center text-[0.688rem] font-medium tracking-wide uppercase text-primary/80 bg-primary/10 px-2.5 py-1 rounded-full">
                  {step.hint}
                </span>

                {/* Mobile arrow connector */}
                {!isLast && (
                  <div className="md:hidden mt-6 mb-2 text-muted-foreground/40" aria-hidden>
                    <ArrowRight className="w-5 h-5 rotate-90" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Closing line */}
        <motion.p
          variants={fadeUp}
          custom={steps.length + 3}
          className="text-sm text-muted-foreground/80 text-center mt-14 max-w-md mx-auto leading-relaxed"
        >
          {t("landing.howClosing")}
        </motion.p>
      </motion.div>
    </section>
  );
});

HowItWorksSection.displayName = "HowItWorksSection";

export default HowItWorksSection;
