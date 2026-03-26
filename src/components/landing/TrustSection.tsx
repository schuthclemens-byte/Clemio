import { motion } from "framer-motion";
import { ShieldCheck, Lock, Trash2, Ban } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const TrustSection = () => {
  const { t } = useI18n();

  const trustPoints = [
    t("landing.trustPoint1"),
    t("landing.trustPoint2"),
    t("landing.trustPoint3"),
    t("landing.trustPoint4"),
  ];

  return (
    <section className="px-6 py-16">
      <motion.div
        className="max-w-md mx-auto"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
      >
        <motion.div variants={fadeUp} custom={0} className="flex items-center gap-2 mb-2 justify-center">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </motion.div>
        <motion.h2 variants={fadeUp} custom={1} className="text-xl sm:text-2xl font-extrabold text-center mb-6 text-foreground">
          {t("landing.trustTitle")}
        </motion.h2>

        <div className="space-y-2">
          {trustPoints.map((point, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              custom={i + 2}
              className="flex items-start gap-3 p-3 rounded-xl bg-card/50 border border-border/50"
            >
              <Lock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span className="text-sm text-foreground">{point}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default TrustSection;
