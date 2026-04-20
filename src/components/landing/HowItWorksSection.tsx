import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Smartphone, Mic, MessageCircleHeart, ArrowRight } from "lucide-react";
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
      icon: Smartphone,
      number: "01",
      title: t("landing.howV2Step1Title"),
      description: t("landing.howV2Step1Desc"),
      hint: t("landing.howV2Step1Hint"),
    },
    {
      icon: Mic,
      number: "02",
      title: t("landing.howV2Step2Title"),
      description: t("landing.howV2Step2Desc"),
      hint: t("landing.howV2Step2Hint"),
    },
    {
      icon: MessageCircleHeart,
      number: "03",
      title: t("landing.howV2Step3Title"),
      description: t("landing.howV2Step3Desc"),
      hint: t("landing.howV2Step3Hint"),
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
          {t("landing.howV2Eyebrow")}
        </motion.p>

        {/* Headline */}
        <motion.h2
          variants={fadeUp}
          custom={1}
          className="text-3xl sm:text-4xl font-extrabold text-center text-foreground tracking-tight mb-4"
        >
          {t("landing.howV2Title")}
        </motion.h2>

        {/* Sub */}
        <motion.p
          variants={fadeUp}
          custom={2}
          className="text-base text-muted-foreground text-center max-w-xl mx-auto mb-16 leading-relaxed"
        >
          {t("landing.howV2Subtitle")}
        </motion.p>

        {/* Steps row (desktop) / stack (mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 relative">
          {/* Connector line on desktop */}
          <div
            className="hidden md:block absolute top-10 left-[16.66%] right-[16.66%] h-px bg-border/60 pointer-events-none"
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
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center text-primary">
                    <Icon className="w-8 h-8" strokeWidth={1.5} />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-foreground text-background text-[0.65rem] font-semibold flex items-center justify-center">
                    {step.number}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-base text-foreground mb-2 leading-snug">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed mb-3 max-w-[14rem]">
                  {step.description}
                </p>

                {/* Hint chip */}
                <span className="inline-flex items-center text-[0.7rem] font-medium tracking-wide text-muted-foreground/70">
                  {step.hint}
                </span>

                {/* Mobile arrow connector */}
                {!isLast && (
                  <div className="md:hidden mt-6 text-muted-foreground/30" aria-hidden>
                    <ArrowRight className="w-4 h-4 rotate-90" />
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
          {t("landing.howV2Closing")}
        </motion.p>
      </motion.div>
    </section>
  );
});

HowItWorksSection.displayName = "HowItWorksSection";

export default HowItWorksSection;
