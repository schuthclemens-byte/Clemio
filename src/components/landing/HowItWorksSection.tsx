import { motion } from "framer-motion";
import { MessageSquare, Ear, Headphones } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: "easeOut" as const },
  }),
};

const HowItWorksSection = () => {
  const { t } = useI18n();

  const steps = [
    { icon: <MessageSquare className="w-6 h-6" />, number: "01", title: t("landing.howStep1Title"), description: t("landing.howStep1Desc") },
    { icon: <Ear className="w-6 h-6" />, number: "02", title: t("landing.howStep2Title"), description: t("landing.howStep2Desc") },
    { icon: <Headphones className="w-6 h-6" />, number: "03", title: t("landing.howStep3Title"), description: t("landing.howStep3Desc") },
  ];

  return (
    <section className="relative px-6 py-24">
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-background/50 to-transparent pointer-events-none" />

      <motion.div
        className="max-w-lg mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
      >
        <motion.p variants={fadeUp} custom={0} className="text-primary text-sm font-bold uppercase tracking-wider text-center mb-3">
          Clevara
        </motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-extrabold text-center mb-3 text-foreground leading-tight">
          {t("landing.howTitle")}
        </motion.h2>
        <motion.p variants={fadeUp} custom={2} className="text-muted-foreground text-center text-base mb-14">
          {t("landing.howSubtitle")}
        </motion.p>

        <div className="space-y-4">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              custom={i + 3}
              whileHover={{ x: 4 }}
              className="flex items-start gap-5 p-5 rounded-2xl bg-card border border-border shadow-sm hover:shadow-elevated transition-all duration-300"
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground shrink-0">
                  {step.icon}
                </div>
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-foreground text-background text-[0.65rem] font-bold flex items-center justify-center">
                  {step.number}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default HowItWorksSection;
