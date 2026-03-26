import { motion } from "framer-motion";
import { Volume2, Mic2, ShieldCheck, Trash2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const PromoSection = () => {
  const { t } = useI18n();

  const features = [
    { icon: Volume2, text: t("landing.promoFeat1") },
    { icon: Mic2, text: t("landing.promoFeat2") },
    { icon: ShieldCheck, text: t("landing.promoFeat3") },
    { icon: Trash2, text: t("landing.promoFeat4") },
  ];

  return (
    <section className="px-6 py-20">
      <motion.div
        className="max-w-md mx-auto text-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      >
        <motion.h2 variants={fadeUp} custom={0} className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-3">
          {t("landing.promoHeadline")}
        </motion.h2>
        <motion.p variants={fadeUp} custom={1} className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-8">
          {t("landing.promoDesc")}
        </motion.p>

        <div className="space-y-3 text-left mb-10">
          {features.map((f, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              custom={i + 2}
              className="flex items-start gap-3 p-3 rounded-xl bg-card/50 border border-border/50"
            >
              <f.icon className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <span className="text-sm text-foreground">{f.text}</span>
            </motion.div>
          ))}
        </div>

        <motion.p variants={fadeUp} custom={6} className="text-base font-bold text-primary italic">
          {t("landing.promoCTA")}
        </motion.p>
      </motion.div>
    </section>
  );
};

export default PromoSection;
